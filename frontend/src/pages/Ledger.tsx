import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCompany } from '../components/Layout';
import {
  AccountSelect, Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Modal, MoneyInput, PageHeader, Spinner,
  invalidateAccounts, useApi, useToast,
} from '../components/ui';
import { money, today } from '../format';
import { can } from '../session';
import { DocumentPreview } from './Purchases';

const SOURCE_LABEL: Record<string, string> = {
  manual: 'A', bank: 'bank', invoice: 'invoice', invoice_payment: 'payments', bill: 'bills', bill_payment: 'payments', payroll: 'payroll', vat: 'vatReturn', year_end: 'closeYear', reversal: 'reversal',
};

export function VouchersPage() {
  const { t } = useTranslation();
  const { id, base, role } = useCompany();
  const [q, setQ] = useState('');
  const [series, setSeries] = useState('');
  const [offset, setOffset] = useState(0);
  const { data, error } = useApi<any[]>(`/companies/${id}/vouchers`, { q, series, offset, limit: 100 });
  return (
    <>
      <PageHeader title={t('vouchers')} actions={can(role, 'accountant') ? <Link className="btn btn-primary" to={`${base}/vouchers/new`}>{t('newVoucher')}</Link> : null} />
      <div className="toolbar">
        <Input type="search" placeholder={t('search')} value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} />
        <select className="input w-auto" value={series} onChange={(e) => { setSeries(e.target.value); setOffset(0); }} aria-label={t('series')}>
          <option value="">{t('series')}: {t('all')}</option>
          {['A', 'B', 'F', 'I', 'L', 'U', 'P', 'M', 'Y'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ErrorBox error={error} />
      {!data ? <Spinner /> : data.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('voucher')}</th><th>{t('date')}</th><th>{t('description')}</th><th className="num">{t('amount')}</th><th /></tr></thead>
            <tbody>
              {data.map((v) => (
                <tr key={v.id}>
                  <td><Link to={`${base}/vouchers/${v.id}`}>{v.ref}</Link></td>
                  <td>{v.date}</td>
                  <td>{v.description}</td>
                  <td className="num">{money(v.total)}</td>
                  <td>{v.reversed ? <Badge status="credited" label={t('reversed')} /> : v.isReversal ? <Badge status="draft" label={t('reversal')} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
      <div className="row">
        {offset > 0 ? <Button small onClick={() => setOffset(Math.max(0, offset - 100))}>←</Button> : null}
        {data && data.length === 100 ? <Button small onClick={() => setOffset(offset + 100)}>→</Button> : null}
      </div>
    </>
  );
}

interface VLine { account: number | null; debit: number | null; credit: number | null; description: string }

export function VoucherEditor() {
  const { t } = useTranslation();
  const { id, base } = useCompany();
  const navigate = useNavigate();
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<VLine[]>([
    { account: null, debit: null, credit: null, description: '' },
    { account: null, debit: null, credit: null, description: '' },
  ]);
  const [documentIds, setDocumentIds] = useState<number[]>([]);
  const docs = useApi<any[]>(`/companies/${id}/documents`, { unlinked: 'true' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const update = (i: number, p: Partial<VLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const debit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  const balanced = debit === credit && debit > 0;

  return (
    <>
      <PageHeader title={t('newVoucher')} />
      <Card>
        <div className="grid2">
          <Field label={t('date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('description')}><Input value={description} onChange={(e) => setDescription(e.target.value)} required /></Field>
        </div>
        <div className="table-wrap">
          <table className="edit-table">
            <thead><tr><th>{t('account')}</th><th>{t('debit')}</th><th>{t('credit')}</th><th>{t('description')}</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td className="w-acc"><AccountSelect companyId={id} value={l.account} onChange={(n) => update(i, { account: n })} /></td>
                  <td className="w-money"><MoneyInput aria-label={t('debit')} value={l.debit} onChange={(v) => update(i, { debit: v, ...(v ? { credit: null } : {}) })} /></td>
                  <td className="w-money"><MoneyInput aria-label={t('credit')} value={l.credit} onChange={(v) => update(i, { credit: v, ...(v ? { debit: null } : {}) })} /></td>
                  <td><Input aria-label={t('description')} value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                  <td><button type="button" className="icon-btn" aria-label={t('delete')} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td>{t('total')}</td><td className="num">{money(debit)}</td><td className="num">{money(credit)}</td><td colSpan={2}>{balanced ? <Badge status="paid" label={t('balanced')} /> : <Badge status="overdue" label={`${t('difference')} ${money(debit - credit)}`} />}</td></tr>
            </tfoot>
          </table>
        </div>
        <Button small onClick={() => setLines((ls) => [...ls, { account: null, debit: null, credit: null, description: '' }])}>+ {t('addLine')}</Button>
        {docs.data?.length ? (
          <Field label={t('attachment')}>
            <div className="checks">
              {docs.data.map((d) => (
                <label key={d.id}><input type="checkbox" checked={documentIds.includes(d.id)} onChange={(e) => setDocumentIds((xs) => (e.target.checked ? [...xs, d.id] : xs.filter((x) => x !== d.id)))} /> {d.name}</label>
              ))}
            </div>
          </Field>
        ) : null}
      </Card>
      <ErrorBox error={error} />
      <div className="row">
        <Button
          variant="primary"
          busy={busy}
          disabled={!balanced || !description}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const r = await api(`/companies/${id}/vouchers`, {
                method: 'POST',
                body: {
                  date,
                  description,
                  documentIds,
                  lines: lines.filter((l) => l.account && (l.debit || l.credit)).map((l) => ({
                    account: l.account, ...(l.debit ? { debit: l.debit } : {}), ...(l.credit ? { credit: l.credit } : {}), description: l.description,
                  })),
                },
              });
              navigate(`${base}/vouchers/${r.data.id}`);
            } catch (err) { setError(err); } finally { setBusy(false); }
          }}
        >
          {t('book')}
        </Button>
        <Button onClick={() => navigate(-1)}>{t('cancel')}</Button>
      </div>
    </>
  );
}

export function VoucherView() {
  const { t } = useTranslation();
  const { id, base, role } = useCompany();
  const { voucherId } = useParams();
  const navigate = useNavigate();
  const { data: v, error } = useApi<any>(`/companies/${id}/vouchers/${voucherId}`);
  if (error) return <ErrorBox error={error} />;
  if (!v) return <Spinner />;
  const reversible = ['manual', 'bank'].includes(v.sourceType) && !v.reversedById && !v.reversesId;
  return (
    <>
      <PageHeader
        title={`${t('voucher')} ${v.ref}`}
        subtitle={`${v.date} · ${v.description}`}
        actions={reversible && can(role, 'accountant') ? (
          <ConfirmButton variant="danger" label={t('reverse')} message={t('reverseConfirm')} onConfirm={async () => {
            const r = await api(`/companies/${id}/vouchers/${v.id}/reverse`, { method: 'POST', body: {} });
            navigate(`${base}/vouchers/${r.data.id}`);
          }} />
        ) : null}
      />
      <div className="grid-main">
        <Card>
          <table>
            <thead><tr><th>{t('account')}</th><th>{t('description')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th></tr></thead>
            <tbody>
              {v.lines.map((l: any) => (
                <tr key={l.lineNo}><td>{l.account} {l.accountName}</td><td>{l.description}</td><td className="num">{l.debit ? money(l.debit) : ''}</td><td className="num">{l.credit ? money(l.credit) : ''}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2}>{t('total')}</td><td className="num">{money(v.total)}</td><td className="num">{money(v.total)}</td></tr></tfoot>
          </table>
          <p className="muted small">
            {t(SOURCE_LABEL[v.sourceType] || v.sourceType, { defaultValue: v.sourceType })} · {v.createdBy} · {new Date(v.createdAt).toLocaleString('sv-SE')}
            {v.reversedByRef ? <> · {t('reversed')}: <Link to={`${base}/vouchers/${v.reversedById}`}>{v.reversedByRef}</Link></> : null}
            {v.reversesRef ? <> · {t('reversal')} {t('of', { defaultValue: 'av' })} <Link to={`${base}/vouchers/${v.reversesId}`}>{v.reversesRef}</Link></> : null}
          </p>
        </Card>
        <Card title={t('attachment')}>
          {v.documents.length ? v.documents.map((d: any) => <DocumentPreview key={d.id} companyId={id} documentId={d.id} mimeType={d.mimeType} />) : <p className="muted">—</p>}
        </Card>
      </div>
    </>
  );
}

export function AccountsPage() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const toast = useToast();
  const { data, error, reload } = useApi<any[]>(`/companies/${id}/accounts`);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: '', name: '' });
  const [formError, setFormError] = useState<unknown>(null);
  const rows = (data || []).filter((a) => !q || String(a.number).startsWith(q) || a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title={t('accounts')} subtitle="BAS 2024" actions={can(role, 'accountant') ? <Button variant="primary" onClick={() => setAdding(true)}>{t('newAccount')}</Button> : null} />
      <div className="toolbar"><Input type="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <ErrorBox error={error} />
      {!data ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('number')}</th><th>{t('name')}</th><th>{t('vat')}</th><th>{t('status')}</th><th /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.number} className={a.active ? '' : 'muted'}>
                  <td>{a.number}</td><td>{a.name}</td><td>{a.vatCode || ''}</td>
                  <td>{a.active ? t('active') : t('inactive')}{a.used ? ` · ${t('used')}` : ''}</td>
                  <td>
                    {can(role, 'accountant') ? (
                      <Button small variant="ghost" onClick={async () => {
                        await api(`/companies/${id}/accounts/${a.number}`, { method: 'PATCH', body: { active: !a.active } });
                        invalidateAccounts(id);
                        reload();
                      }}>{a.active ? t('inactive') : t('active')}</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding ? (
        <Modal title={t('newAccount')} onClose={() => setAdding(false)}>
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(`/companies/${id}/accounts`, { method: 'POST', body: { number: Number(form.number), name: form.name } });
              invalidateAccounts(id);
              setAdding(false);
              setForm({ number: '', name: '' });
              toast(t('saved'));
              reload();
            } catch (err) { setFormError(err); }
          }}>
            <Field label={t('number')} hint="1000–9999"><Input required inputMode="numeric" pattern="\d{4}" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
            <Field label={t('name')}><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <ErrorBox error={formError} />
            <div className="modal-actions"><Button onClick={() => setAdding(false)}>{t('cancel')}</Button><Button type="submit" variant="primary">{t('save')}</Button></div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

