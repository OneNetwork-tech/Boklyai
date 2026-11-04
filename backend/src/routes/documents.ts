import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config';
import { one, pool, query } from '../db';
import { requireRole } from '../middleware/auth';
import { idParam } from '../middleware/validate';
import { audit } from '../services/audit';
import { processDocument, sniffMime, storagePath, store } from '../services/documents';
import { ah, badRequest, conflict, notFound } from '../utils/errors';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.uploads.maxBytes, files: 1 } });

function docJson(d: any) {
  return {
    id: d.id, name: d.original_name, mimeType: d.mime_type, size: d.size_bytes, ocrStatus: d.ocr_status, extracted: d.extracted,
    voucherId: d.voucher_id, voucherRef: d.voucher_ref ?? null, billId: d.bill_id ?? null, uploadedBy: d.uploaded_by_email ?? null, createdAt: d.created_at,
  };
}

router.get('/documents', requireRole('viewer'), ah(async (req, res) => {
  const unlinked = req.query.unlinked === 'true';
  const rows = await query(pool, `
    SELECT d.*, v.series || v.number AS voucher_ref, u.email AS uploaded_by_email,
           (SELECT b.id FROM bills b WHERE b.document_id = d.id LIMIT 1) AS bill_id
      FROM documents d LEFT JOIN vouchers v ON v.id = d.voucher_id LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.company_id = $1 AND (NOT $2 OR (d.voucher_id IS NULL AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.document_id = d.id)))
     ORDER BY d.created_at DESC LIMIT 500`, [req.company!.id, unlinked]);
  res.json({ data: rows.map(docJson) });
}));

router.post('/documents', requireRole('member'), upload.single('file'), ah(async (req, res) => {
  if (!req.file) throw badRequest('Upload a file in the "file" field');
  const mime = sniffMime(req.file.buffer);
  if (!mime) throw badRequest('Only PDF, JPEG, PNG and WebP files are accepted');
  const { storageKey, sha256 } = await store(req.company!.id, req.file.buffer);
  const name = (req.file.originalname || 'dokument').replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 200);
  const doc = await one(pool, `INSERT INTO documents (company_id, original_name, mime_type, size_bytes, storage_key, sha256, uploaded_by)
                               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  [req.company!.id, name, mime, req.file.size, storageKey, sha256, req.session!.user.id]);
  await audit(req, 'document.upload', 'document', doc!.id, { name, sha256 });
  // OCR can take a few seconds; ?wait=true processes inline (used by the UI for instant prefill).
  if (req.query.wait === 'true') await processDocument(doc!.id);
  else processDocument(doc!.id).catch(() => {});
  const fresh = await one(pool, 'SELECT * FROM documents WHERE id = $1', [doc!.id]);
  res.status(201).json({ data: docJson(fresh) });
}));

router.get('/documents/:id', requireRole('viewer'), ah(async (req, res) => {
  const d = await one(pool, `SELECT d.*, v.series || v.number AS voucher_ref FROM documents d LEFT JOIN vouchers v ON v.id = d.voucher_id
                             WHERE d.id = $1 AND d.company_id = $2`, [idParam(req.params.id), req.company!.id]);
  if (!d) throw notFound('Document not found');
  res.json({ data: { ...docJson(d), ocrText: d.ocr_text } });
}));

router.get('/documents/:id/file', requireRole('viewer'), ah(async (req, res) => {
  const d = await one(pool, 'SELECT * FROM documents WHERE id = $1 AND company_id = $2', [idParam(req.params.id), req.company!.id]);
  if (!d) throw notFound('Document not found');
  const file = storagePath(d.storage_key);
  await fs.promises.access(file).catch(() => { throw notFound('File missing from storage'); });
  const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
  res.set({
    'Content-Type': d.mime_type,
    'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(d.original_name)}`,
    'X-Content-Type-Options': 'nosniff',
    // Rendered documents get no script privileges (sniffing already restricts
    // uploads to PDF/images; 'sandbox' is omitted because it disables PDF viewers).
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    'Cache-Control': 'private, max-age=300',
  });
  fs.createReadStream(file).pipe(res);
}));

router.post('/documents/:id/reprocess', requireRole('member'), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const d = await one(pool, 'SELECT id FROM documents WHERE id = $1 AND company_id = $2', [id, req.company!.id]);
  if (!d) throw notFound('Document not found');
  await processDocument(id);
  const fresh = await one(pool, 'SELECT * FROM documents WHERE id = $1', [id]);
  res.json({ data: docJson(fresh) });
}));

/**
 * Only unattached documents can be deleted: once a document supports a voucher it
 * is part of the accounting records (räkenskapsinformation) and must be kept.
 */
router.delete('/documents/:id', requireRole('member'), ah(async (req, res) => {
  const id = idParam(req.params.id);
  const d = await one(pool, `SELECT d.*, EXISTS (SELECT 1 FROM bills b WHERE b.document_id = d.id AND b.status <> 'draft') AS on_booked_bill
                             FROM documents d WHERE d.id = $1 AND d.company_id = $2`, [id, req.company!.id]);
  if (!d) throw notFound('Document not found');
  if (d.voucher_id || d.on_booked_bill) throw conflict('Documents attached to vouchers are accounting records and must be kept (7 years)');
  await pool.query('UPDATE bills SET document_id = NULL WHERE document_id = $1', [id]);
  await pool.query('DELETE FROM documents WHERE id = $1', [id]);
  await fs.promises.rm(storagePath(d.storage_key), { force: true });
  await audit(req, 'document.delete', 'document', id, { name: d.original_name });
  res.status(204).end();
}));

export default router;
