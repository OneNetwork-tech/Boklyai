import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../components/Layout';
import {
  Card, ErrorBox, PageHeader, Spinner, useApi,
} from '../components/ui';
import { krRound } from '../format';
import { can } from '../session';

function Kpi({ label, value, sub, to, tone }: { label: string; value: string; sub?: string; to?: string; tone?: 'good' | 'bad' }) {
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <span className={`kpi-value${tone ? ` kpi-${tone}` : ''}`}>{value}</span>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </>
  );
  return to ? <Link to={to} className="kpi kpi-link">{body}</Link> : <div className="kpi">{body}</div>;
}

function BarChart({ data }: { data: { month: string; revenue: number; costs: number }[] }) {
  const { t, i18n } = useTranslation();
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.costs]));
  const w = 720;
  const h = 220;
  const pad = 28;
  const slot = (w - pad) / data.length;
  const bar = Math.max(4, slot / 2 - 6);
  const y = (v: number) => h - pad - (Math.max(0, v) / max) * (h - pad - 10);
  const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString(i18n.language === 'sv' ? 'sv-SE' : 'en-GB', { month: 'short' });
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={t('revenueVsCosts')}>
        <line x1={pad} x2={w} y1={h - pad} y2={h - pad} className="chart-axis" />
        {data.map((d, i) => {
          const x = pad + i * slot + slot / 2;
          return (
            <g key={d.month}>
              <rect x={x - bar - 1} y={y(d.revenue)} width={bar} height={h - pad - y(d.revenue)} className="bar-rev" rx="2">
                <title>{`${monthName(d.month)}: ${t('revenue')} ${krRound(d.revenue)}`}</title>
              </rect>
              <rect x={x + 1} y={y(d.costs)} width={bar} height={h - pad - y(d.costs)} className="bar-cost" rx="2">
                <title>{`${monthName(d.month)}: ${t('costs')} ${krRound(d.costs)}`}</title>
              </rect>
              <text x={x} y={h - 9} textAnchor="middle" className="chart-label">{monthName(d.month)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span><i className="sw sw-rev" /> {t('revenue')}</span>
        <span><i className="sw sw-cost" /> {t('costs')}</span>
      </figcaption>
    </figure>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { id, base, company, role } = useCompany();
  const { data: d, error, loading } = useApi<any>(`/companies/${id}/dashboard`);
  if (loading && !d) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!d) return null;
  return (
    <>
      <PageHeader
        title={company!.name}
        subtitle={`${t('thisYear')} ${d.fiscalYear.start} – ${d.fiscalYear.end}`}
        actions={can(role, 'member') ? (
          <>
            <Link className="btn btn-primary" to={`${base}/invoices/new`}>{t('newInvoice')}</Link>
            <Link className="btn btn-secondary" to={`${base}/bills/new`}>{t('newBill')}</Link>
          </>
        ) : null}
      />
      <div className="kpis">
        <Kpi label={t('revenueYtd')} value={krRound(d.revenue)} />
        <Kpi label={t('costsYtd')} value={krRound(d.costs)} />
        <Kpi label={t('resultYtd')} value={krRound(d.result)} tone={d.result >= 0 ? 'good' : 'bad'} />
        <Kpi label={t('cash')} value={krRound(d.cash)} to={`${base}/bank`} />
        <Kpi
          label={t('receivables')}
          value={krRound(d.receivables.outstanding)}
          sub={d.receivables.overdueCount ? `${d.receivables.overdueCount} ${t('overdue').toLowerCase()} · ${krRound(d.receivables.overdue)}` : `${d.receivables.count} st`}
          to={`${base}/invoices?status=unpaid`}
          tone={d.receivables.overdueCount ? 'bad' : undefined}
        />
        <Kpi label={t('payables')} value={krRound(d.payables.outstanding)} sub={`${t('dueSoon')}: ${krRound(d.payables.dueSoon)}`} to={`${base}/bills?status=unpaid`} />
        <Kpi label={t('unmatchedBank')} value={String(d.unmatchedBankTransactions)} to={`${base}/bank`} tone={d.unmatchedBankTransactions ? 'bad' : undefined} />
        <Kpi label={t('vatToSettle')} value={krRound(d.vatBalance)} to={`${base}/vat`} />
      </div>
      <div className="grid-main">
        <Card title={t('revenueVsCosts')}><BarChart data={d.monthly} /></Card>
        <Card title={t('recentVouchers')} actions={<Link to={`${base}/vouchers`}>{t('vouchers')} →</Link>}>
          {d.recentVouchers.length ? (
            <ul className="list">
              {d.recentVouchers.map((v: any) => (
                <li key={v.id}><Link to={`${base}/vouchers/${v.id}`}><b>{v.ref}</b> {v.description}</Link><span className="muted">{v.date}</span></li>
              ))}
            </ul>
          ) : <p className="muted">{t('nothingHere')}</p>}
        </Card>
      </div>
    </>
  );
}
