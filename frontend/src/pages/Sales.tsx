import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCompany } from '../components/Layout';
import {
  AccountSelect, Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Modal, MoneyInput, PageHeader, Select,
  Spinner, useApi, useToast, VatSelect,
} from '../components/ui';
import { kr, money, today } from '../format';
import { can } from '../session';

const STATUS_TABS = ['', 'draft', 'unpaid', 'overdue', 'paid', 'credited'] as const;

export function InvoicesPage() {
  const { t } = useTranslation();
  const { id, base, role } = useCompany();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const customerId = params.get('customer') || '';
  const { data, error, loading } = useApi<any[]>(`/companies/${id}/invoices`, { status, customerId });
  return (
    <>
      <PageHeader title={t('invoices')} actions={can(role, 'member') ? <Link className="btn btn-primary" to={`${base}/invoices/new`}>{t('newInvoice')}</Link> : null} />
      <div className="tabs">
        {STATUS_TABS.map((s) => (
          <button key={s} type="button" className={status === s ? 'active' : ''} onClick={() => setParams(s ? { status: s } : {})}>
            {s ? t(s) : t('all')}
          </button>
        ))}
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : data && data.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('number')}</th><th>{t('customer')}</th><th>{t('invoiceDate')}</th><th>{t('dueDate')}</th><th className="num">{t('total')}</th><th className="num">{t('remaining')}</th><th>{t('status')}</th></tr></thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id} className="clickable">
                  <td><Link to={`${base}/invoices/${i.id}`}>{i.number ?? '—'}{i.kind === 'credit_note' ? ` (${t('creditNote')})` : ''}</Link></td>
                  <td>{i.customerName}</td>
                  <td>{i.issueDate}</td>
                  <td>{i.dueDate}</td>
                  <td className="num">{money(i.total)}</td>
                  <td className="num">{i.remaining ? money(i.remaining) : ''}</td>
                  <td><Badge status={i.overdue ? 'overdue' : i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
    </>
  );
}

interface Line { description: string; quantity: string; unit: string; unitPrice: number | null; vatRate: 0 | 6 | 12 | 25; account: number | null }
const emptyLine = (): Line => ({ description: '', quantity: '1', unit: 'st', unitPrice: null, vatRate: 25, account: null });
const SALES_ACCOUNT: Record<number, number> = { 25: 3001, 12: 3002, 6: 3003, 0: 3004 };

function lineNet(l: Line) {
  const q = Number(l.quantity.replace(',', '.'));
  if (!Number.isFinite(q) || l.unitPrice === null) return 0;
  return Math.round(Math.round(q * 1000) * l.unitPrice / 1000);
}

export function InvoiceEditor() {
  const { t } = useTranslation();
  const { id, base } = useCompany();
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const customers = useApi<any[]>(`/companies/${id}/customers`);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [ourReference, setOurReference] = useState('');
  const [yourReference, setYourReference] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [newCustomer, setNewCustomer] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    api(`/companies/${id}/invoices/${invoiceId}`).then(({ data }) => {
      setCustomerId(data.customer.id);
      setIssueDate(data.issueDate);
      setDueDate(data.dueDate);
      setOurReference(data.ourReference);
      setYourReference(data.yourReference);
      setNotes(data.notes);
      setLines(data.lines.map((l: any) => ({
        description: l.description, quantity: String(l.quantity).replace('.', ','), unit: l.unit, unitPrice: l.unitPrice, vatRate: l.vatRate,
        account: l.account === SALES_ACCOUNT[l.vatRate] ? null : l.account,
      })));
    }).catch(setError);
  }, [id, invoiceId]);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const net = lines.reduce((s, l) => s + lineNet(l), 0);
  const vat = lines.reduce((s, l) => s + Math.sign(lineNet(l)) * Math.round(Math.abs(lineNet(l)) * l.vatRate / 100), 0);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        customerId: Number(customerId),
        issueDate,
        dueDate: dueDate || undefined,
        ourReference,
        yourReference,
        notes,
        lines: lines.filter((l) => l.description.trim()).map((l) => ({
          description: l.description, quantity: Number(l.quantity.replace(',', '.')), unit: l.unit, unitPrice: l.unitPrice ?? 0, vatRate: l.vatRate,
          ...(l.account ? { account: l.account } : {}),
        })),
      };
      const r = invoiceId
        ? await api(`/companies/${id}/invoices/${invoiceId}`, { method: 'PUT', body })
        : await api(`/companies/${id}/invoices`, { method: 'POST', body });
      toast(t('saved'));
      navigate(`${base}/invoices/${r.data.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={invoiceId ? `${t('edit')} ${t('draft').toLowerCase()}` : t('newInvoice')} />
      <Card>
        <div className="grid3">
          <Field label={t('customer')}>
            <div className="row nowrap">
              <Select value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))} required>
                <option value="" disabled>—</option>
                {(customers.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button small onClick={() => setNewCustomer(true)}>+</Button>
            </div>
          </Field>
          <Field label={t('invoiceDate')}><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
          <Field label={t('dueDate')} hint={t('paymentTerms')}><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label={t('ourReference')}><Input value={ourReference} onChange={(e) => setOurReference(e.target.value)} /></Field>
          <Field label={t('yourReference')}><Input value={yourReference} onChange={(e) => setYourReference(e.target.value)} /></Field>
        </div>
      </Card>
      <Card title={t('lines')}>
        <div className="table-wrap">
          <table className="edit-table">
            <thead><tr><th>{t('description')}</th><th>{t('quantity')}</th><th>{t('unit')}</th><th>{t('unitPrice')}</th><th>{t('vat')}</th><th>{t('account')}</th><th className="num">{t('net')}</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td><Input aria-label={t('description')} value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                  <td className="w-qty"><Input aria-label={t('quantity')} inputMode="decimal" className="input num" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></td>
                  <td className="w-unit"><Input aria-label={t('unit')} value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} /></td>
                  <td className="w-money"><MoneyInput aria-label={t('unitPrice')} value={l.unitPrice} onChange={(v) => update(i, { unitPrice: v })} /></td>
                  <td className="w-vat"><VatSelect value={l.vatRate} onChange={(v) => update(i, { vatRate: v })} /></td>
                  <td className="w-acc">
                    <AccountSelect companyId={id} value={l.account ?? SALES_ACCOUNT[l.vatRate]} onChange={(n) => update(i, { account: n })} filter={(a) => a.number >= 3000 && a.number < 4000} />
                  </td>
                  <td className="num">{money(lineNet(l))}</td>
                  <td><button type="button" className="icon-btn" aria-label={t('delete')} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button small onClick={() => setLines((ls) => [...ls, emptyLine()])}>+ {t('addLine')}</Button>
        <dl className="totals">
          <dt>{t('net')}</dt><dd>{kr(net)}</dd>
          <dt>{t('vat')}</dt><dd>{kr(vat)}</dd>
          <dt className="strong">{t('total')}</dt><dd className="strong">{kr(net + vat)}</dd>
        </dl>
        <Field label={t('notes')}><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </Card>
      <ErrorBox error={error} />
      <div className="row">
        <Button variant="primary" busy={busy} onClick={save} disabled={!customerId}>{t('saveDraft')}</Button>
        <Button onClick={() => navigate(-1)}>{t('cancel')}</Button>
      </div>
      {newCustomer ? (
        <CustomerModal
          onClose={() => setNewCustomer(false)}
          onSaved={(c) => { customers.reload(); setCustomerId(c.id); setNewCustomer(false); }}
        />
      ) : null}
    </>
  );
}

export function InvoiceView() {
  const { t } = useTranslation();
  const { id, base, role, company } = useCompany();
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: inv, error, reload, setData } = useApi<any>(`/companies/${id}/invoices/${invoiceId}`);
  const companyInfo = useApi<any>(`/companies/${id}`);
  const [paying, setPaying] = useState(false);
  if (error) return <ErrorBox error={error} />;
  if (!inv) return <Spinner />;
  const c = companyInfo.data;
  const isCredit = inv.kind === 'credit_note';
  const title = `${isCredit ? t('creditNote') : t('invoice')} ${inv.number ?? `(${t('draft').toLowerCase()})`}`;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={<Badge status={inv.overdue ? 'overdue' : inv.status} />}
        actions={(
          <>
            {inv.status === 'draft' && can(role, 'member') ? <Link className="btn btn-secondary" to={`${base}/invoices/${inv.id}/edit`}>{t('edit')}</Link> : null}
            {inv.status === 'draft' && can(role, 'member') ? (
              <ConfirmButton variant="danger" label={t('delete')} message={`${t('delete')}?`} onConfirm={async () => { await api(`/companies/${id}/invoices/${inv.id}`, { method: 'DELETE' }); navigate(`${base}/invoices`); }} />
            ) : null}
            {inv.status === 'draft' && can(role, 'accountant') ? (
              <ConfirmButton label={t('issue')} message={t('issueConfirm')} onConfirm={async () => { const r = await api(`/companies/${id}/invoices/${inv.id}/issue`, { method: 'POST' }); setData(r.data); toast(`${t('invoice')} ${r.data.number}`); }} />
            ) : null}
            {inv.status === 'issued' && !isCredit && can(role, 'accountant') ? <Button variant="primary" onClick={() => setPaying(true)}>{t('registerPayment')}</Button> : null}
            {inv.status === 'issued' && !isCredit && inv.paid === 0 && can(role, 'accountant') ? (
              <ConfirmButton variant="secondary" label={t('creditInvoice')} message={t('creditConfirm')} onConfirm={async () => { const r = await api(`/companies/${id}/invoices/${inv.id}/credit`, { method: 'POST', body: {} }); navigate(`${base}/invoices/${r.data.id}`); }} />
            ) : null}
            {inv.number ? <Button onClick={() => window.print()}>{t('print')}</Button> : null}
          </>
        )}
      />
      <article className="invoice-doc card">
        <header className="invoice-head">
          <div>
            <div className="invoice-company">{company?.name}</div>
            {c ? <div className="muted small">{c.address}<br />{c.postalCode} {c.city}<br />{t('orgNumber')}: {c.orgNumber}<br />{t('vatNumber')}: {c.vatNumber}</div> : null}
          </div>
          <div className="invoice-meta">
            <h2>{isCredit ? t('creditNote') : t('invoice')}</h2>
            <dl>
              <dt>{t('invoiceNumber')}</dt><dd>{inv.number ?? '—'}</dd>
              <dt>{t('invoiceDate')}</dt><dd>{inv.issueDate}</dd>
              {!isCredit ? <><dt>{t('dueDate')}</dt><dd>{inv.dueDate}</dd></> : null}
              {inv.ocr && !isCredit ? <><dt>{t('ocr')}</dt><dd><b>{inv.ocr}</b></dd></> : null}
              {inv.ourReference ? <><dt>{t('ourReference')}</dt><dd>{inv.ourReference}</dd></> : null}
              {inv.yourReference ? <><dt>{t('yourReference')}</dt><dd>{inv.yourReference}</dd></> : null}
              {inv.creditsNumber ? <><dt>{t('invoice')}</dt><dd>{inv.creditsNumber}</dd></> : null}
            </dl>
          </div>
        </header>
        <div className="invoice-to">
          <b>{inv.customer.name}</b><br />
          {inv.customer.address}{inv.customer.address ? <br /> : null}
          {inv.customer.postalCode} {inv.customer.city}
          {inv.customer.orgNumber ? <><br />{t('orgNumber')}: {inv.customer.orgNumber}</> : null}
        </div>
        <table>
          <thead><tr><th>{t('description')}</th><th className="num">{t('quantity')}</th><th className="num">{t('unitPrice')}</th><th className="num">{t('vat')}</th><th className="num">{t('net')}</th></tr></thead>
          <tbody>
            {inv.lines.map((l: any) => (
              <tr key={l.lineNo}><td>{l.description}</td><td className="num">{String(l.quantity).replace('.', ',')} {l.unit}</td><td className="num">{money(l.unitPrice)}</td><td className="num">{l.vatRate} %</td><td className="num">{money(l.net)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="invoice-foot">
          <table className="vat-summary">
            <thead><tr><th>{t('vatRate')}</th><th className="num">{t('net')}</th><th className="num">{t('vat')}</th></tr></thead>
            <tbody>{inv.vatSummary.map((v: any) => <tr key={v.rate}><td>{v.rate} %</td><td className="num">{money(v.net)}</td><td className="num">{money(v.vat)}</td></tr>)}</tbody>
          </table>
          <dl className="totals">
            <dt>{t('net')}</dt><dd>{kr(inv.net)}</dd>
            <dt>{t('vat')}</dt><dd>{kr(inv.vat)}</dd>
            <dt className="strong">{isCredit ? t('total') : t('toPay')}</dt><dd className="strong">{kr(inv.total)}</dd>
          </dl>
        </div>
        {!isCredit && c && (c.bankgiro || c.plusgiro || c.iban) ? (
          <p className="pay-info">{t('payTo')}: {c.bankgiro ? `${t('bankgiro')} ${c.bankgiro}` : c.plusgiro ? `${t('plusgiro')} ${c.plusgiro}` : `IBAN ${c.iban}`}{inv.ocr ? ` · ${t('ocr')} ${inv.ocr}` : ''}</p>
        ) : null}
        {inv.notes ? <p className="muted">{inv.notes}</p> : null}
      </article>
      <div className="no-print grid2">
        {inv.payments.length ? (
          <Card title={t('payments')}>
            <ul className="list">{inv.payments.map((p: any) => <li key={p.id}><span>{p.date} · {p.voucherRef}</span><b>{kr(p.amount)}</b></li>)}</ul>
            <p>{t('remaining')}: <b>{kr(inv.remaining)}</b></p>
          </Card>
        ) : null}
        {inv.voucherId ? <Card title={t('voucher')}><Link to={`${base}/vouchers/${inv.voucherId}`}>{inv.voucherRef}</Link></Card> : null}
      </div>
      {paying ? (
        <PaymentModal
          title={t('registerPayment')}
          remaining={inv.remaining}
          onClose={() => setPaying(false)}
          onSubmit={async (body) => { await api(`/companies/${id}/invoices/${inv.id}/payments`, { method: 'POST', body }); setPaying(false); reload(); toast(t('saved')); }}
        />
      ) : null}
    </>
  );
}

export function PaymentModal({ title, remaining, onClose, onSubmit }: { title: string; remaining: number; onClose: () => void; onSubmit: (b: any) => Promise<void> }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState<number | null>(remaining);
  const [account, setAccount] = useState(1930);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="stack">
        <Field label={t('date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('amount')} hint={`${t('remaining')}: ${kr(remaining)}`}><MoneyInput value={amount} onChange={setAmount} /></Field>
        <Field label={t('account')}><AccountSelect companyId={id} value={account} onChange={setAccount} filter={(a) => a.number >= 1900 && a.number < 2000} /></Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant="primary"
            busy={busy}
            disabled={!amount}
            onClick={async () => {
              setBusy(true);
              try { await onSubmit({ date, amount, account }); } catch (err) { setError(err); } finally { setBusy(false); }
            }}
          >
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Customers -------------------------------------------------------------------

export function CustomerModal({ customer, onClose, onSaved }: { customer?: any; onClose: () => void; onSaved: (c: any) => void }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [form, setForm] = useState({
    name: customer?.name || '', orgNumber: customer?.orgNumber || '', email: customer?.email || '', address: customer?.address || '',
    postalCode: customer?.postalCode || '', city: customer?.city || '', paymentTermsDays: customer?.paymentTermsDays ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title={customer ? customer.name : t('newCustomer')} onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const body = { ...form, paymentTermsDays: form.paymentTermsDays === '' ? null : Number(form.paymentTermsDays) };
            const r = customer
              ? await api(`/companies/${id}/customers/${customer.id}`, { method: 'PATCH', body })
              : await api(`/companies/${id}/customers`, { method: 'POST', body });
            onSaved(r.data);
          } catch (err) { setError(err); } finally { setBusy(false); }
        }}
      >
        <Field label={t('name')}><Input required value={form.name} onChange={set('name')} autoFocus /></Field>
        <div className="grid2">
          <Field label={t('orgNumber')}><Input value={form.orgNumber} onChange={set('orgNumber')} /></Field>
          <Field label={t('email')}><Input type="email" value={form.email} onChange={set('email')} /></Field>
        </div>
        <Field label={t('address')}><Input value={form.address} onChange={set('address')} /></Field>
        <div className="grid3">
          <Field label={t('postalCode')}><Input value={form.postalCode} onChange={set('postalCode')} /></Field>
          <Field label={t('city')}><Input value={form.city} onChange={set('city')} /></Field>
          <Field label={t('paymentTerms')}><Input type="number" min={0} max={365} value={form.paymentTermsDays} onChange={set('paymentTermsDays')} /></Field>
        </div>
        <ErrorBox error={error} />
        <div className="modal-actions"><Button onClick={onClose}>{t('cancel')}</Button><Button type="submit" variant="primary" busy={busy}>{t('save')}</Button></div>
      </form>
    </Modal>
  );
}

export function CustomersPage() {
  const { t } = useTranslation();
  const { id, role, base } = useCompany();
  const { data, error, reload } = useApi<any[]>(`/companies/${id}/customers`);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  return (
    <>
      <PageHeader title={t('customers')} actions={can(role, 'member') ? <Button variant="primary" onClick={() => setEditing(null)}>{t('newCustomer')}</Button> : null} />
      <ErrorBox error={error} />
      {!data ? <Spinner /> : data.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('number')}</th><th>{t('name')}</th><th>{t('orgNumber')}</th><th>{t('email')}</th><th className="num">{t('outstanding')}</th><th /></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>{c.number}</td><td>{c.name}</td><td>{c.orgNumber}</td><td>{c.email}</td><td className="num">{money(c.outstanding)}</td>
                  <td className="row nowrap">
                    <Link to={`${base}/invoices?customer=${c.id}`} className="small">{t('invoices')}</Link>
                    {can(role, 'member') ? <Button small variant="ghost" onClick={() => setEditing(c)}>{t('edit')}</Button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
      {editing !== undefined ? <CustomerModal customer={editing || undefined} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload(); }} /> : null}
    </>
  );
}
