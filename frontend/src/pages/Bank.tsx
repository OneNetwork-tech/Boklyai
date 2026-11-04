import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, upload } from '../api';
import { useCompany } from '../components/Layout';
import {
  AccountSelect, Badge, Button, Card, Empty, ErrorBox, Field, Input, Modal, MoneyInput, PageHeader, Select, Spinner, useApi, useToast, VatSelect, useAccounts,
} from '../components/ui';
import { kr, money, today } from '../format';
import { can } from '../session';

function BookModal({ tx, initial, onClose, onDone }: { tx: any; initial?: { account: number; vatRate: number }; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [account, setAccount] = useState<number | null>(initial?.account ?? null);
  const [vatRate, setVatRate] = useState<0 | 6 | 12 | 25>((initial?.vatRate as 0 | 6 | 12 | 25) ?? (tx.amount < 0 ? 25 : 0));
  const [description, setDescription] = useState(tx.description);
  const [documentId, setDocumentId] = useState<number | ''>('');
  const docs = useApi<any[]>(`/companies/${id}/documents`, { unlinked: 'true' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const gross = Math.abs(tx.amount);
  const vat = vatRate ? Math.round((gross * vatRate) / (100 + vatRate)) : 0;
  return (
    <Modal title={t('bookAs')} onClose={onClose}>
      <div className="stack">
        <p><b>{tx.date}</b> · {tx.description} · <b>{kr(tx.amount)}</b></p>
        <Field label={t('account')}><AccountSelect companyId={id} value={account} onChange={setAccount} /></Field>
        <div className="grid2">
          <Field label={t('vatRate')}><VatSelect value={vatRate} onChange={setVatRate} /></Field>
          <Field label={t('vat')}><Input readOnly value={money(vat)} className="input num" /></Field>
        </div>
        <Field label={t('description')}><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label={t('attachment')}>
          <Select value={documentId} onChange={(e) => setDocumentId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">—</option>
            {(docs.data || []).map((d) => <option key={d.id} value={d.id}>{d.name}{d.extracted?.total ? ` (${kr(d.extracted.total)})` : ''}</option>)}
          </Select>
        </Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant="primary"
            busy={busy}
            disabled={!account}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/companies/${id}/bank-transactions/${tx.id}/book`, { method: 'POST', body: { account, vatRate, description, ...(documentId ? { documentId } : {}) } });
                onDone();
              } catch (err) { setError(err); } finally { setBusy(false); }
            }}
          >
            {t('book')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({ bankAccount, onClose, onDone }: { bankAccount: any; onClose: () => void; onDone: (msg: string) => void }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Modal title={`${t('importCsv')} – ${bankAccount.name}`} onClose={onClose}>
      <div className="stack">
        <p className="muted small">Swedbank, SEB, Handelsbanken, Nordea, Danske Bank, Lunar… (CSV: Datum;Text;Belopp)</p>
        <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <ErrorBox error={error} />
        <div className="modal-actions">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant="primary"
            busy={busy}
            disabled={!file}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await upload(`/companies/${id}/bank-accounts/${bankAccount.id}/import`, file!);
                onDone(`${t('imported')}: ${r.data.imported}, ${r.data.duplicates} ${t('duplicates')}`);
              } catch (err) { setError(err); } finally { setBusy(false); }
            }}
          >
            {t('upload')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ManualTxModal({ bankAccount, onClose, onDone }: { bankAccount: any; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  return (
    <Modal title={t('addTransaction')} onClose={onClose}>
      <div className="stack">
        <Field label={t('date')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t('description')}><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label={t('amount')} hint="−123,45 = uttag / withdrawal"><MoneyInput allowNegative value={amount} onChange={setAmount} /></Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={!amount || !description} onClick={async () => {
            try { await api(`/companies/${id}/bank-accounts/${bankAccount.id}/transactions`, { method: 'POST', body: { date, description, amount } }); onDone(); } catch (err) { setError(err); }
          }}>{t('save')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function BankPage() {
  const { t } = useTranslation();
  const { id, role, base } = useCompany();
  const toast = useToast();
  const [status, setStatus] = useState('unmatched');
  const accounts = useApi<any[]>(`/companies/${id}/bank-accounts`);
  const txs = useApi<any[]>(`/companies/${id}/bank-transactions`, { status });
  const accountNames = new Map(useAccounts(id).map((a) => [a.number, a.name]));
  const [importing, setImporting] = useState<any>(null);
  const [manual, setManual] = useState<any>(null);
  const [booking, setBooking] = useState<{ tx: any; initial?: any } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const canBook = can(role, 'accountant');

  const refresh = () => { txs.reload(); accounts.reload(); };
  const apply = async (tx: any, s: any) => {
    setError(null);
    try {
      if (s.type === 'account') {
        await api(`/companies/${id}/bank-transactions/${tx.id}/book`, { method: 'POST', body: { account: s.account, vatRate: s.vatRate } });
      } else {
        await api(`/companies/${id}/bank-transactions/${tx.id}/match`, { method: 'POST', body: { type: s.type, id: s.id } });
      }
      toast(t('booked'));
      refresh();
    } catch (err) {
      setError(err);
    }
  };

  return (
    <>
      <PageHeader title={t('bank')} />
      <div className="cards-row">
        {(accounts.data || []).map((a) => (
          <Card key={a.id} title={a.name} className="bank-card">
            <div className="kpi-value">{kr(a.ledgerBalance)}</div>
            <div className="muted small">{t('ledgerAccount')} {a.ledgerAccount}{a.accountNumber ? ` · ${a.clearingNumber}-${a.accountNumber}` : ''}</div>
            {a.unmatched ? <div className="small"><Badge status="unmatched" label={`${a.unmatched} ${t('toHandle').toLowerCase()}`} /></div> : null}
            {canBook ? (
              <div className="row">
                <Button small variant="primary" onClick={() => setImporting(a)}>{t('importCsv')}</Button>
                <Button small onClick={() => setManual(a)}>{t('addTransaction')}</Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
      <div className="tabs">
        {[['unmatched', t('toHandle')], ['booked', t('handled')], ['ignored', t('ignored')]].map(([s, label]) => (
          <button key={s} type="button" className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>{label}</button>
        ))}
      </div>
      <ErrorBox error={error || txs.error} />
      {!txs.data ? <Spinner /> : txs.data.length ? (
        <div className="table-wrap">
          <table className="bank-table">
            <thead><tr><th>{t('date')}</th><th>{t('description')}</th><th className="num">{t('amount')}</th><th>{status === 'unmatched' ? t('suggestion') : t('voucher')}</th><th /></tr></thead>
            <tbody>
              {txs.data.map((tx) => (
                <tr key={tx.id}>
                  <td className="nowrap">{tx.date}</td>
                  <td>{tx.description}</td>
                  <td className={`num ${tx.amount < 0 ? 'neg' : 'pos'}`}>{money(tx.amount)}</td>
                  <td>
                    {status === 'unmatched' ? (
                      <div className="suggestions">
                        {(tx.suggestions || []).slice(0, 2).map((s: any) => (
                          <button
                            key={`${s.type}-${s.id ?? s.account}-${s.vatRate ?? ''}`}
                            type="button"
                            className="chip"
                            disabled={!canBook}
                            title={`${s.reason} · ${t('confidence')} ${Math.round(s.confidence * 100)} %`}
                            onClick={() => apply(tx, s)}
                          >
                            {s.type === 'account' ? `${s.account} ${accountNames.get(s.account) || ''}${s.vatRate ? ` · ${s.vatRate} %` : ''}` : s.label}
                            <small>{Math.round(s.confidence * 100)} %</small>
                          </button>
                        ))}
                        {!tx.suggestions?.length ? <span className="muted small">{t('noSuggestion')}</span> : null}
                      </div>
                    ) : tx.voucherId ? <Link to={`${base}/vouchers/${tx.voucherId}`}>{tx.voucherRef}</Link> : '—'}
                  </td>
                  <td className="nowrap">
                    {canBook && status === 'unmatched' ? (
                      <>
                        <Button small onClick={() => setBooking({ tx, initial: tx.suggestions?.find((s: any) => s.type === 'account') })}>{t('bookAs')}…</Button>
                        <Button small variant="ghost" onClick={async () => { await api(`/companies/${id}/bank-transactions/${tx.id}/ignore`, { method: 'POST', body: { ignored: true } }); refresh(); }}>{t('ignore')}</Button>
                      </>
                    ) : null}
                    {canBook && status === 'ignored' ? (
                      <Button small variant="ghost" onClick={async () => { await api(`/companies/${id}/bank-transactions/${tx.id}/ignore`, { method: 'POST', body: { ignored: false } }); refresh(); }}>{t('restore')}</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
      {importing ? <ImportModal bankAccount={importing} onClose={() => setImporting(null)} onDone={(msg) => { setImporting(null); toast(msg); refresh(); }} /> : null}
      {manual ? <ManualTxModal bankAccount={manual} onClose={() => setManual(null)} onDone={() => { setManual(null); refresh(); }} /> : null}
      {booking ? <BookModal tx={booking.tx} initial={booking.initial} onClose={() => setBooking(null)} onDone={() => { setBooking(null); toast(t('booked')); refresh(); }} /> : null}
    </>
  );
}
