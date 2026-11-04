import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCompany } from '../components/Layout';
import {
  AccountSelect, Badge, Card, ConfirmButton, Empty, ErrorBox, Field, Input, PageHeader, Spinner, useApi, useToast,
} from '../components/ui';
import { kr, money, today } from '../format';
import { can } from '../session';

function usePeriod(companyId: number) {
  const fys = useApi<any[]>(`/companies/${companyId}/fiscal-years`);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  useEffect(() => {
    if (fys.data && !from) {
      const t = today();
      const current = fys.data.find((f) => f.startDate <= t && t <= f.endDate) || fys.data[0];
      setFrom(current.startDate);
      setTo(current.endDate < t ? current.endDate : t);
    }
  }, [fys.data, from]);
  return { fys: fys.data || [], from, to, setFrom, setTo };
}

function PeriodBar({ p }: { p: ReturnType<typeof usePeriod> }) {
  const { t } = useTranslation();
  return (
    <div className="toolbar">
      <Field label={t('from')}><Input type="date" value={p.from} onChange={(e) => p.setFrom(e.target.value)} /></Field>
      <Field label={t('to')}><Input type="date" value={p.to} onChange={(e) => p.setTo(e.target.value)} /></Field>
      <Field label={t('periodQuick')}>
        <select className="input" value="" onChange={(e) => { const f = p.fys.find((x) => String(x.id) === e.target.value); if (f) { p.setFrom(f.startDate); p.setTo(f.endDate); } }}>
          <option value="">—</option>
          {p.fys.map((f) => <option key={f.id} value={f.id}>{f.startDate} – {f.endDate}</option>)}
        </select>
      </Field>
    </div>
  );
}

function Sections({ sections }: { sections: any[] }) {
  return (
    <>
      {sections.filter((s) => s.accounts.length).map((s) => (
        <tbody key={s.key} className="report-section">
          <tr className="section-title"><td colSpan={2}>{s.label}</td></tr>
          {s.accounts.map((a: any) => <tr key={a.number}><td className="indent">{a.number ? `${a.number} ` : ''}{a.name}</td><td className="num">{money(a.amount)}</td></tr>)}
          <tr className="subtotal"><td>Summa {s.label.toLowerCase()}</td><td className="num">{money(s.total)}</td></tr>
        </tbody>
      ))}
    </>
  );
}

function IncomeStatement({ cid, from, to }: { cid: number; from: string; to: string }) {
  const { t } = useTranslation();
  const { data, error } = useApi<any>(from && to ? `/companies/${cid}/reports/income-statement` : null, { from, to });
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  const get = (k: string) => data.sections.find((s: any) => s.key === k);
  return (
    <table className="report">
      <Sections sections={[get('netSales'), get('otherIncome'), get('goods'), get('external'), get('personnel'), get('depreciation'), get('otherOperating')]} />
      <tbody><tr className="total"><td>{t('operatingResult')}</td><td className="num">{money(data.operatingResult)}</td></tr></tbody>
      <Sections sections={[get('financial')]} />
      <tbody><tr className="total"><td>{t('resultAfterFinancial')}</td><td className="num">{money(data.resultAfterFinancial)}</td></tr></tbody>
      <Sections sections={[get('appropriations'), get('tax')]} />
      <tbody><tr className="grand"><td>{t('netResult')}</td><td className="num">{money(data.netResult)}</td></tr></tbody>
    </table>
  );
}

function BalanceSheet({ cid, date }: { cid: number; date: string }) {
  const { t } = useTranslation();
  const { data, error } = useApi<any>(date ? `/companies/${cid}/reports/balance-sheet` : null, { date });
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  return (
    <>
      {!data.balanced ? <div className="alert alert-error">Balansräkningen balanserar inte – kontakta support.</div> : null}
      <table className="report">
        <tbody><tr className="section-head"><td colSpan={2}>{t('assets')}</td></tr></tbody>
        <Sections sections={data.assets} />
        <tbody><tr className="grand"><td>{t('totalAssets')}</td><td className="num">{money(data.totalAssets)}</td></tr></tbody>
        <tbody><tr className="section-head"><td colSpan={2}>{t('equityLiabilities')}</td></tr></tbody>
        <Sections sections={data.equityAndLiabilities} />
        <tbody><tr className="grand"><td>{t('totalEquityLiabilities')}</td><td className="num">{money(data.totalEquityAndLiabilities)}</td></tr></tbody>
      </table>
    </>
  );
}

function TrialBalance({ cid, from, to }: { cid: number; from: string; to: string }) {
  const { t } = useTranslation();
  const { data, error } = useApi<any>(from && to ? `/companies/${cid}/reports/trial-balance` : null, { from, to });
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  if (!data.accounts.length) return <Empty />;
  return (
    <table>
      <thead><tr><th>{t('account')}</th><th className="num">{t('opening')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th><th className="num">{t('closing')}</th></tr></thead>
      <tbody>
        {data.accounts.map((a: any) => <tr key={a.number}><td>{a.number} {a.name}</td><td className="num">{money(a.opening)}</td><td className="num">{money(a.debit)}</td><td className="num">{money(a.credit)}</td><td className="num">{money(a.closing)}</td></tr>)}
      </tbody>
      <tfoot><tr><td>{t('total')}</td><td /><td className="num">{money(data.totals.debit)}</td><td className="num">{money(data.totals.credit)}</td><td className="num">{money(data.totals.closing)}</td></tr></tfoot>
    </table>
  );
}

function GeneralLedger({ cid, from, to }: { cid: number; from: string; to: string }) {
  const { t } = useTranslation();
  const { base } = useCompany();
  const [account, setAccount] = useState<number>(1930);
  const { data, error } = useApi<any>(from && to ? `/companies/${cid}/reports/general-ledger` : null, { account, from, to });
  return (
    <>
      <div className="toolbar"><Field label={t('account')}><AccountSelect companyId={cid} value={account} onChange={setAccount} /></Field></div>
      <ErrorBox error={error} />
      {!data ? <Spinner /> : (
        <table>
          <thead><tr><th>{t('date')}</th><th>{t('voucher')}</th><th>{t('description')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th><th className="num">{t('balance')}</th></tr></thead>
          <tbody>
            <tr className="muted"><td colSpan={5}>{t('opening')}</td><td className="num">{money(data.opening)}</td></tr>
            {data.lines.map((l: any, i: number) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i}><td>{l.date}</td><td><Link to={`${base}/vouchers/${l.voucherId}`}>{l.ref}</Link></td><td>{l.description}</td><td className="num">{l.debit ? money(l.debit) : ''}</td><td className="num">{l.credit ? money(l.credit) : ''}</td><td className="num">{money(l.balance)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={5}>{t('closing')}</td><td className="num">{money(data.closing)}</td></tr></tfoot>
        </table>
      )}
    </>
  );
}

export function ReportsPage() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const p = usePeriod(id);
  const [tab, setTab] = useState<'is' | 'bs' | 'tb' | 'gl'>('is');
  const fyForSie = p.fys.find((f) => f.startDate <= p.from && p.from <= f.endDate);
  return (
    <>
      <PageHeader
        title={t('reports')}
        actions={can(role, 'accountant') && fyForSie ? <a className="btn btn-secondary" href={`/api/companies/${id}/sie/${fyForSie.id}`}>{t('sieExport')}</a> : null}
      />
      <div className="tabs">
        {([['is', t('incomeStatement')], ['bs', t('balanceSheet')], ['tb', t('trialBalance')], ['gl', t('generalLedger')]] as const).map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <PeriodBar p={p} />
      <Card className="report-card">
        {tab === 'is' ? <IncomeStatement cid={id} from={p.from} to={p.to} /> : null}
        {tab === 'bs' ? <BalanceSheet cid={id} date={p.to} /> : null}
        {tab === 'tb' ? <TrialBalance cid={id} from={p.from} to={p.to} /> : null}
        {tab === 'gl' ? <GeneralLedger cid={id} from={p.from} to={p.to} /> : null}
      </Card>
    </>
  );
}

// --- VAT ----------------------------------------------------------------------------

export function VatPage() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const toast = useToast();
  const periods = useApi<any[]>(`/companies/${id}/vat/periods`);
  const [sel, setSel] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    if (periods.data && !sel) {
      const t0 = today();
      const pick = periods.data.find((p) => p.to < t0 && !p.settled) || periods.data[0];
      if (pick) setSel({ from: pick.from, to: pick.to });
    }
  }, [periods.data, sel]);
  const report = useApi<any>(sel ? `/companies/${id}/vat/report` : null, sel || undefined);
  const r = report.data;
  const boxes = ['box05', 'box42', 'box10', 'box11', 'box12', 'box48', 'box49'];
  return (
    <>
      <PageHeader title={t('vatReport')} subtitle="SKV 4700" />
      <div className="grid-side">
        <Card title={t('vatPeriods')}>
          {!periods.data ? <Spinner /> : (
            <ul className="list selectable">
              {periods.data.map((p) => (
                <li key={p.from} className={sel?.from === p.from ? 'selected' : ''}>
                  <button type="button" className="link-btn" onClick={() => setSel({ from: p.from, to: p.to })}>{p.from} – {p.to}</button>
                  <Badge status={p.settled ? 'settled' : p.to < today() ? 'pending' : 'open'} label={p.settled ? t('settled') : t('notSettled')} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={sel ? `${sel.from} – ${sel.to}` : ''}>
          <ErrorBox error={report.error} />
          {!r ? <Spinner /> : (
            <>
              <table className="report">
                <thead><tr><th>{t('box')}</th><th /><th className="num">kr</th></tr></thead>
                <tbody>
                  {boxes.map((b) => (
                    <tr key={b} className={b === 'box49' ? 'grand' : ''}>
                      <td>{b.replace('box', '')}</td>
                      <td>{r.labels[b]}</td>
                      <td className="num">{new Intl.NumberFormat('sv-SE').format(r.kronor[b])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">
                {r.kronor.box49 >= 0 ? t('toPay') : t('toReceive')}: <b>{kr(Math.abs(r.ore.box49))}</b>
                {r.settled ? <> · {t('settled')} ({r.settled.voucherRef})</> : null}
              </p>
              {!r.settled && sel && sel.to < today() && can(role, 'accountant') ? (
                <ConfirmButton label={t('settleVat')} message={t('settleConfirm')} onConfirm={async () => {
                  const res = await api(`/companies/${id}/vat/settle`, { method: 'POST', body: sel });
                  toast(`${t('settled')}: ${res.data.voucherRef}`);
                  periods.reload();
                  report.reload();
                }} />
              ) : null}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
