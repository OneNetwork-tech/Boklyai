import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, upload } from '../api';
import { useCompany } from '../components/Layout';
import {
  AccountSelect, Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Modal, MoneyInput, PageHeader, Select,
  Spinner, useApi, useToast, VatSelect,
} from '../components/ui';
import { kr, money, today } from '../format';
import { can } from '../session';
import { PaymentModal } from './Sales';

export function BillsPage() {
  const { t } = useTranslation();
  const { id, base, role } = useCompany();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const { data, error } = useApi<any[]>(`/companies/${id}/bills`, { status });
  return (
    <>
      <PageHeader title={t('bills')} actions={can(role, 'member') ? <Link className="btn btn-primary" to={`${base}/bills/new`}>{t('newBill')}</Link> : null} />
      <div className="tabs">
        {['', 'draft', 'unpaid', 'overdue', 'paid'].map((s) => (
          <button key={s} type="button" className={status === s ? 'active' : ''} onClick={() => setParams(s ? { status: s } : {})}>{s ? t(s) : t('all')}</button>
        ))}
      </div>
      <ErrorBox error={error} />
      {!data ? <Spinner /> : data.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('supplier')}</th><th>{t('supplierInvoiceNumber')}</th><th>{t('invoiceDate')}</th><th>{t('dueDate')}</th><th className="num">{t('total')}</th><th>{t('status')}</th></tr></thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id}>
                  <td><Link to={`${base}/bills/${b.id}`}>{b.supplierName}</Link></td>
                  <td>{b.supplierInvoiceNumber}</td><td>{b.invoiceDate}</td><td>{b.dueDate}</td>
                  <td className="num">{money(b.total)}</td>
                  <td><Badge status={b.overdue ? 'overdue' : b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
    </>
  );
}

interface BillLine { description: string; account: number | null; net: number | null; vatRate: 0 | 6 | 12 | 25; vat: number | null }
const vatOf = (net: number | null, rate: number) => (net === null ? 0 : Math.round((net * rate) / 100));

export function BillEditor() {
  const { t } = useTranslation();
  const { id, base } = useCompany();
  const { billId } = useParams();
  const navigate = useNavigate();
  const suppliers = useApi<any[]>(`/companies/${id}/suppliers`);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [form, setForm] = useState({ supplierInvoiceNumber: '', invoiceDate: today(), dueDate: '', paymentReference: '', notes: '' });
  const [lines, setLines] = useState<BillLine[]>([{ description: '', account: null, net: null, vatRate: 25, vat: null }]);
  const [document, setDocument] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [newSupplier, setNewSupplier] = useState(false);

  useEffect(() => {
    if (!billId) return;
    api(`/companies/${id}/bills/${billId}`).then(({ data }) => {
      setSupplierId(data.supplierId);
      setForm({ supplierInvoiceNumber: data.supplierInvoiceNumber, invoiceDate: data.invoiceDate, dueDate: data.dueDate, paymentReference: data.paymentReference, notes: data.notes });
      setLines(data.lines.map((l: any) => ({ description: l.description, account: l.account, net: l.net, vatRate: l.vatRate, vat: l.vat })));
      if (data.documentId) setDocument({ id: data.documentId });
    }).catch(setError);
  }, [id, billId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const updateLine = (i: number, patch: Partial<BillLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const pickSupplier = (sid: number) => {
    setSupplierId(sid);
    const s = (suppliers.data || []).find((x) => x.id === sid);
    if (s?.defaultAccount) setLines((ls) => ls.map((l) => (l.account ? l : { ...l, account: s.defaultAccount })));
  };

  const onFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const r = await upload(`/companies/${id}/documents`, file, { wait: 'true' });
      setDocument(r.data);
      const x = r.data.extracted || {};
      if (Object.keys(x).length) {
        setForm((f) => ({
          ...f,
          invoiceDate: x.date || f.invoiceDate,
          dueDate: x.dueDate || f.dueDate,
          paymentReference: x.ocr || f.paymentReference,
          supplierInvoiceNumber: x.invoiceNumber || f.supplierInvoiceNumber,
        }));
        if (x.total) {
          const rate = (x.vatRate ?? 25) as 0 | 6 | 12 | 25;
          const vat = x.vat ?? Math.round((x.total * rate) / (100 + rate));
          setLines((ls) => [{ ...ls[0], net: x.total - vat, vat, vatRate: rate }, ...ls.slice(1)]);
        }
        const match = (suppliers.data || []).find((s) => (x.orgNumber && s.orgNumber === x.orgNumber) || (x.bankgiro && s.bankgiro === x.bankgiro));
        if (match) pickSupplier(match.id);
        setPrefilled(true);
      }
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  };

  const totalNet = lines.reduce((s, l) => s + (l.net ?? 0), 0);
  const totalVat = lines.reduce((s, l) => s + (l.vat ?? vatOf(l.net, l.vatRate)), 0);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        supplierId: Number(supplierId),
        ...form,
        dueDate: form.dueDate || undefined,
        documentId: document?.id ?? null,
        lines: lines.filter((l) => l.net !== null && l.account).map((l) => ({
          description: l.description, account: l.account, net: l.net, vatRate: l.vatRate, ...(l.vat !== null ? { vat: l.vat } : {}),
        })),
      };
      const r = billId
        ? await api(`/companies/${id}/bills/${billId}`, { method: 'PUT', body })
        : await api(`/companies/${id}/bills`, { method: 'POST', body });
      navigate(`${base}/bills/${r.data.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={billId ? t('edit') : t('newBill')} />
      <div className="grid-main">
        <div>
          <Card>
            <div className="grid2">
              <Field label={t('supplier')}>
                <div className="row nowrap">
                  <Select value={supplierId} onChange={(e) => pickSupplier(Number(e.target.value))}>
                    <option value="" disabled>—</option>
                    {(suppliers.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <Button small onClick={() => setNewSupplier(true)}>+</Button>
                </div>
              </Field>
              <Field label={t('supplierInvoiceNumber')}><Input value={form.supplierInvoiceNumber} onChange={set('supplierInvoiceNumber')} /></Field>
              <Field label={t('invoiceDate')}><Input type="date" value={form.invoiceDate} onChange={set('invoiceDate')} /></Field>
              <Field label={t('dueDate')}><Input type="date" value={form.dueDate} onChange={set('dueDate')} /></Field>
              <Field label={t('paymentReference')}><Input value={form.paymentReference} onChange={set('paymentReference')} /></Field>
            </div>
            {prefilled ? <div className="alert alert-info">{t('prefilled')}</div> : null}
          </Card>
          <Card title={t('lines')}>
            <div className="table-wrap">
              <table className="edit-table">
                <thead><tr><th>{t('account')}</th><th>{t('description')}</th><th>{t('net')}</th><th>{t('vatRate')}</th><th>{t('vat')}</th><th /></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={i}>
                      <td className="w-acc"><AccountSelect companyId={id} value={l.account} onChange={(n) => updateLine(i, { account: n })} filter={(a) => !(a.number >= 2600 && a.number < 2700) && !(a.number >= 3000 && a.number < 4000) && a.number !== 2440} /></td>
                      <td><Input aria-label={t('description')} value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} /></td>
                      <td className="w-money"><MoneyInput aria-label={t('net')} value={l.net} onChange={(v) => updateLine(i, { net: v, vat: null })} /></td>
                      <td className="w-vat"><VatSelect value={l.vatRate} onChange={(v) => updateLine(i, { vatRate: v, vat: null })} /></td>
                      <td className="w-money"><MoneyInput aria-label={t('vat')} value={l.vat ?? vatOf(l.net, l.vatRate)} onChange={(v) => updateLine(i, { vat: v })} /></td>
                      <td><button type="button" className="icon-btn" aria-label={t('delete')} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button small onClick={() => setLines((ls) => [...ls, { description: '', account: null, net: null, vatRate: 25, vat: null }])}>+ {t('addLine')}</Button>
            <dl className="totals">
              <dt>{t('net')}</dt><dd>{kr(totalNet)}</dd>
              <dt>{t('vat')}</dt><dd>{kr(totalVat)}</dd>
              <dt className="strong">{t('total')}</dt><dd className="strong">{kr(totalNet + totalVat)}</dd>
            </dl>
          </Card>
        </div>
        <Card title={t('attachment')}>
          {document?.id ? (
            <DocumentPreview companyId={id} documentId={document.id} mimeType={document.mimeType} />
          ) : (
            <label className="dropzone">
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              {uploading ? <Spinner /> : <span>{t('uploadReceipt')}</span>}
            </label>
          )}
        </Card>
      </div>
      <ErrorBox error={error} />
      <div className="row">
        <Button variant="primary" busy={busy} onClick={save} disabled={!supplierId}>{t('saveDraft')}</Button>
        <Button onClick={() => navigate(-1)}>{t('cancel')}</Button>
      </div>
      {newSupplier ? <SupplierModal onClose={() => setNewSupplier(false)} onSaved={(s) => { suppliers.reload(); pickSupplier(s.id); setNewSupplier(false); }} /> : null}
    </>
  );
}

export function DocumentPreview({ companyId, documentId, mimeType }: { companyId: number; documentId: number; mimeType?: string }) {
  const url = `/api/companies/${companyId}/documents/${documentId}/file`;
  return (
    <div className="doc-preview">
      {mimeType && mimeType.startsWith('image/') ? <img src={url} alt="" /> : <iframe src={url} title="document" />}
      <a href={`${url}?download=true`} className="small">⬇</a>
    </div>
  );
}

export function BillView() {
  const { t } = useTranslation();
  const { id, base, role } = useCompany();
  const { billId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: b, error, reload, setData } = useApi<any>(`/companies/${id}/bills/${billId}`);
  const [paying, setPaying] = useState(false);
  if (error) return <ErrorBox error={error} />;
  if (!b) return <Spinner />;
  return (
    <>
      <PageHeader
        title={`${b.supplierName} ${b.supplierInvoiceNumber}`}
        subtitle={<Badge status={b.overdue ? 'overdue' : b.status} />}
        actions={(
          <>
            {b.status === 'draft' && can(role, 'member') ? <Link className="btn btn-secondary" to={`${base}/bills/${b.id}/edit`}>{t('edit')}</Link> : null}
            {b.status === 'draft' && can(role, 'member') ? <ConfirmButton variant="danger" label={t('delete')} message={`${t('delete')}?`} onConfirm={async () => { await api(`/companies/${id}/bills/${b.id}`, { method: 'DELETE' }); navigate(`${base}/bills`); }} /> : null}
            {b.status === 'draft' && can(role, 'accountant') ? <ConfirmButton label={t('book')} message={`${t('book')} ${kr(b.total)}?`} onConfirm={async () => { const r = await api(`/companies/${id}/bills/${b.id}/book`, { method: 'POST' }); setData(r.data); toast(r.data.voucherRef); }} /> : null}
            {b.status === 'booked' && can(role, 'accountant') ? <Button variant="primary" onClick={() => setPaying(true)}>{t('pay')}</Button> : null}
          </>
        )}
      />
      <div className="grid-main">
        <Card>
          <dl className="dl">
            <dt>{t('invoiceDate')}</dt><dd>{b.invoiceDate}</dd>
            <dt>{t('dueDate')}</dt><dd>{b.dueDate}</dd>
            {b.paymentReference ? <><dt>{t('paymentReference')}</dt><dd>{b.paymentReference}</dd></> : null}
            {b.supplierBankgiro ? <><dt>{t('bankgiro')}</dt><dd>{b.supplierBankgiro}</dd></> : null}
            {b.voucherRef ? <><dt>{t('voucher')}</dt><dd><Link to={`${base}/vouchers/${b.voucherId}`}>{b.voucherRef}</Link></dd></> : null}
          </dl>
          <table>
            <thead><tr><th>{t('account')}</th><th>{t('description')}</th><th className="num">{t('net')}</th><th className="num">{t('vat')}</th></tr></thead>
            <tbody>{b.lines.map((l: any) => <tr key={l.lineNo}><td>{l.account}</td><td>{l.description}</td><td className="num">{money(l.net)}</td><td className="num">{money(l.vat)} ({l.vatRate} %)</td></tr>)}</tbody>
          </table>
          <dl className="totals">
            <dt>{t('net')}</dt><dd>{kr(b.net)}</dd><dt>{t('vat')}</dt><dd>{kr(b.vat)}</dd>
            <dt className="strong">{t('total')}</dt><dd className="strong">{kr(b.total)}</dd>
            {b.status !== 'draft' ? <><dt>{t('remaining')}</dt><dd>{kr(b.remaining)}</dd></> : null}
          </dl>
          {b.payments.length ? <ul className="list">{b.payments.map((p: any) => <li key={p.id}><span>{p.date} · {p.voucherRef}</span><b>{kr(p.amount)}</b></li>)}</ul> : null}
        </Card>
        <Card title={t('attachment')}>{b.documentId ? <DocumentPreview companyId={id} documentId={b.documentId} /> : <p className="muted">—</p>}</Card>
      </div>
      {paying ? (
        <PaymentModal title={t('pay')} remaining={b.remaining} onClose={() => setPaying(false)} onSubmit={async (body) => { await api(`/companies/${id}/bills/${b.id}/payments`, { method: 'POST', body }); setPaying(false); reload(); }} />
      ) : null}
    </>
  );
}

export function SupplierModal({ supplier, onClose, onSaved }: { supplier?: any; onClose: () => void; onSaved: (s: any) => void }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [form, setForm] = useState({
    name: supplier?.name || '', orgNumber: supplier?.orgNumber || '', email: supplier?.email || '', bankgiro: supplier?.bankgiro || '', plusgiro: supplier?.plusgiro || '',
  });
  const [defaultAccount, setDefaultAccount] = useState<number | null>(supplier?.defaultAccount ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title={supplier ? supplier.name : t('newSupplier')} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const body = { ...form, defaultAccount };
            const r = supplier
              ? await api(`/companies/${id}/suppliers/${supplier.id}`, { method: 'PATCH', body })
              : await api(`/companies/${id}/suppliers`, { method: 'POST', body });
            onSaved(r.data);
          } catch (err) { setError(err); } finally { setBusy(false); }
        }}
      >
        <Field label={t('name')}><Input required autoFocus value={form.name} onChange={set('name')} /></Field>
        <div className="grid2">
          <Field label={t('orgNumber')}><Input value={form.orgNumber} onChange={set('orgNumber')} /></Field>
          <Field label={t('email')}><Input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label={t('bankgiro')}><Input value={form.bankgiro} onChange={set('bankgiro')} /></Field>
          <Field label={t('plusgiro')}><Input value={form.plusgiro} onChange={set('plusgiro')} /></Field>
        </div>
        <Field label={t('defaultAccount')}><AccountSelect companyId={id} value={defaultAccount} onChange={setDefaultAccount} filter={(a) => a.number >= 4000 && a.number < 8000} /></Field>
        <ErrorBox error={error} />
        <div className="modal-actions"><Button onClick={onClose}>{t('cancel')}</Button><Button type="submit" variant="primary" busy={busy}>{t('save')}</Button></div>
      </form>
    </Modal>
  );
}

export function SuppliersPage() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const { data, error, reload } = useApi<any[]>(`/companies/${id}/suppliers`);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  return (
    <>
      <PageHeader title={t('suppliers')} actions={can(role, 'member') ? <Button variant="primary" onClick={() => setEditing(null)}>{t('newSupplier')}</Button> : null} />
      <ErrorBox error={error} />
      {!data ? <Spinner /> : data.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('name')}</th><th>{t('orgNumber')}</th><th>{t('bankgiro')}</th><th>{t('defaultAccount')}</th><th className="num">{t('outstanding')}</th><th /></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td><td>{s.orgNumber}</td><td>{s.bankgiro}</td><td>{s.defaultAccount}</td><td className="num">{money(s.outstanding)}</td>
                  <td>{can(role, 'member') ? <Button small variant="ghost" onClick={() => setEditing(s)}>{t('edit')}</Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
      {editing !== undefined ? <SupplierModal supplier={editing || undefined} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} /> : null}
    </>
  );
}

// --- Documents --------------------------------------------------------------------

export function DocumentsPage() {
  const { t } = useTranslation();
  const { id, base, role } = useCompany();
  const [unlinked, setUnlinked] = useState(false);
  const { data, error, reload } = useApi<any[]>(`/companies/${id}/documents`, { unlinked: unlinked ? 'true' : undefined });
  const [preview, setPreview] = useState<any>(null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <PageHeader
        title={t('documents')}
        actions={can(role, 'member') ? (
          <label className="btn btn-primary">
            {uploading ? t('loading') : t('upload')}
            <input
              type="file"
              hidden
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                setUploadError(null);
                try { await upload(`/companies/${id}/documents`, f, { wait: 'true' }); reload(); } catch (err) { setUploadError(err); } finally { setUploading(false); e.target.value = ''; }
              }}
            />
          </label>
        ) : null}
      />
      <div className="tabs">
        <button type="button" className={!unlinked ? 'active' : ''} onClick={() => setUnlinked(false)}>{t('all')}</button>
        <button type="button" className={unlinked ? 'active' : ''} onClick={() => setUnlinked(true)}>{t('unlinked')}</button>
      </div>
      <ErrorBox error={error || uploadError} />
      {!data ? <Spinner /> : data.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('name')}</th><th>{t('date')}</th><th>{t('ocrStatus')}</th><th>{t('extracted')}</th><th>{t('linkedTo')}</th><th /></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td><button type="button" className="link-btn" onClick={() => setPreview(d)}>{d.name}</button></td>
                  <td>{d.createdAt.slice(0, 10)}</td>
                  <td><Badge status={d.ocrStatus} /></td>
                  <td className="small">{d.extracted?.total ? `${kr(d.extracted.total)}${d.extracted.date ? ` · ${d.extracted.date}` : ''}` : ''}</td>
                  <td>{d.voucherId ? <Link to={`${base}/vouchers/${d.voucherId}`}>{d.voucherRef}</Link> : d.billId ? <Link to={`${base}/bills/${d.billId}`}>{t('bills')}</Link> : '—'}</td>
                  <td>
                    {!d.voucherId && can(role, 'member') ? (
                      <ConfirmButton variant="ghost" label={t('delete')} message={`${t('delete')} ${d.name}?`} onConfirm={async () => { await api(`/companies/${id}/documents/${d.id}`, { method: 'DELETE' }); reload(); }} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
      {preview ? (
        <Modal title={preview.name} onClose={() => setPreview(null)} wide>
          <DocumentPreview companyId={id} documentId={preview.id} mimeType={preview.mimeType} />
          {preview.extracted && Object.keys(preview.extracted).length ? <pre className="small">{JSON.stringify(preview.extracted, null, 2)}</pre> : null}
        </Modal>
      ) : null}
    </>
  );
}

