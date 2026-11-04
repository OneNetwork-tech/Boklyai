import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCompany } from '../components/Layout';
import {
  Badge, Button, Card, ConfirmButton, Empty, ErrorBox, Field, Input, Modal, MoneyInput, PageHeader, Spinner, useApi, useToast,
} from '../components/ui';
import { kr, money, today, percent } from '../format';

function EmployeeModal({ employee, onClose, onSaved }: { employee?: any; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const { id } = useCompany();
  const [form, setForm] = useState({
    firstName: employee?.firstName || '', lastName: employee?.lastName || '', personalNumber: employee?.personalNumber || '', email: employee?.email || '',
    employmentStart: employee?.employmentStart || today(), taxRate: String(employee?.taxRate ?? 30).replace('.', ','), bankAccount: employee?.bankAccount || '',
  });
  const [salary, setSalary] = useState<number | null>(employee?.monthlySalary ?? null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title={employee ? `${employee.firstName} ${employee.lastName}` : t('newEmployee')} onClose={onClose}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const body = { ...form, taxRate: Number(form.taxRate.replace(',', '.')), monthlySalary: salary ?? 0 };
          if (employee) await api(`/companies/${id}/employees/${employee.id}`, { method: 'PUT', body });
          else await api(`/companies/${id}/employees`, { method: 'POST', body });
          onSaved();
        } catch (err) { setError(err); } finally { setBusy(false); }
      }}>
        <div className="grid2">
          <Field label={t('firstName')}><Input required value={form.firstName} onChange={set('firstName')} /></Field>
          <Field label={t('lastName')}><Input required value={form.lastName} onChange={set('lastName')} /></Field>
          <Field label={t('personalNumber')} hint="ÅÅÅÅMMDD-NNNN"><Input required value={form.personalNumber} onChange={set('personalNumber')} /></Field>
          <Field label={t('employmentStart')}><Input type="date" required value={form.employmentStart} onChange={set('employmentStart')} /></Field>
          <Field label={t('monthlySalary')}><MoneyInput required value={salary} onChange={setSalary} /></Field>
          <Field label={t('taxRate')} hint="Skattetabell / jämkning"><Input required inputMode="decimal" value={form.taxRate} onChange={set('taxRate')} /></Field>
          <Field label={t('email')}><Input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label={t('bankAccountNo')}><Input value={form.bankAccount} onChange={set('bankAccount')} /></Field>
        </div>
        <ErrorBox error={error} />
        <div className="modal-actions"><Button onClick={onClose}>{t('cancel')}</Button><Button type="submit" variant="primary" busy={busy}>{t('save')}</Button></div>
      </form>
    </Modal>
  );
}

export function PayrollPage() {
  const { t } = useTranslation();
  const { id, base } = useCompany();
  const navigate = useNavigate();
  const employees = useApi<any[]>(`/companies/${id}/employees`);
  const runs = useApi<any[]>(`/companies/${id}/payroll-runs`);
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const [newRun, setNewRun] = useState(false);
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [payDate, setPayDate] = useState(`${today().slice(0, 7)}-25`);
  const [error, setError] = useState<unknown>(null);
  return (
    <>
      <PageHeader title={t('payroll')} actions={<Button variant="primary" onClick={() => setNewRun(true)}>{t('newPayrollRun')}</Button>} />
      <ErrorBox error={employees.error || runs.error} />
      <div className="grid2">
        <Card title={t('employees')} actions={<Button small onClick={() => setEditing(null)}>+ {t('newEmployee')}</Button>}>
          {!employees.data ? <Spinner /> : employees.data.length ? (
            <table>
              <thead><tr><th>{t('name')}</th><th>{t('personalNumber')}</th><th className="num">{t('monthlySalary')}</th><th className="num">{t('tax')}</th></tr></thead>
              <tbody>
                {employees.data.map((e) => (
                  <tr key={e.id} className={e.active ? '' : 'muted'}>
                    <td><button type="button" className="link-btn" onClick={() => setEditing(e)}>{e.firstName} {e.lastName}</button></td>
                    <td>{e.personalNumber}</td><td className="num">{money(e.monthlySalary)}</td><td className="num">{percent(e.taxRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Card>
        <Card title={t('payrollRuns')}>
          {!runs.data ? <Spinner /> : runs.data.length ? (
            <table>
              <thead><tr><th>{t('period')}</th><th>{t('payDate')}</th><th className="num">{t('gross')}</th><th>{t('status')}</th></tr></thead>
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id}><td><Link to={`${base}/payroll/${r.id}`}>{r.period}</Link></td><td>{r.payDate}</td><td className="num">{money(r.totals.gross)}</td><td><Badge status={r.status} /></td></tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Card>
      </div>
      {editing !== undefined ? <EmployeeModal employee={editing || undefined} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); employees.reload(); }} /> : null}
      {newRun ? (
        <Modal title={t('newPayrollRun')} onClose={() => setNewRun(false)}>
          <div className="stack">
            <Field label={t('period')}><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
            <Field label={t('payDate')}><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></Field>
            <ErrorBox error={error} />
            <div className="modal-actions">
              <Button onClick={() => setNewRun(false)}>{t('cancel')}</Button>
              <Button variant="primary" onClick={async () => {
                try { const r = await api(`/companies/${id}/payroll-runs`, { method: 'POST', body: { period, payDate } }); navigate(`${base}/payroll/${r.data.id}`); } catch (err) { setError(err); }
              }}>{t('create')}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function PayrollRunPage() {
  const { t } = useTranslation();
  const { id, base, company } = useCompany();
  const { runId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: run, error, setData } = useApi<any>(`/companies/${id}/payroll-runs/${runId}`);
  const agi = useApi<any>(run?.status === 'booked' ? `/companies/${id}/payroll-runs/${runId}/agi` : null);
  const [slip, setSlip] = useState<any>(null);
  const [slipError, setSlipError] = useState<unknown>(null);
  if (error) return <ErrorBox error={error} />;
  if (!run) return <Spinner />;
  const draft = run.status === 'draft';
  const saveSlip = async (patch: Record<string, unknown>) => {
    try {
      const r = await api(`/companies/${id}/payroll-runs/${run.id}/payslips/${slip.id}`, { method: 'PATCH', body: patch });
      setData(r.data);
      setSlip(null);
    } catch (err) { setSlipError(err); }
  };
  return (
    <>
      <PageHeader
        title={`${t('payroll')} ${run.period}`}
        subtitle={<><Badge status={run.status} /> {t('payDate')} {run.payDate}{run.voucherRef ? <> · <Link to={`${base}/vouchers/${run.voucherId}`}>{run.voucherRef}</Link></> : null}</>}
        actions={(
          <>
            {draft ? <ConfirmButton variant="danger" label={t('delete')} message={`${t('delete')}?`} onConfirm={async () => { await api(`/companies/${id}/payroll-runs/${run.id}`, { method: 'DELETE' }); navigate(`${base}/payroll`); }} /> : null}
            {draft ? <ConfirmButton label={t('book')} message={`${t('book')} ${kr(run.totals.gross)}?`} onConfirm={async () => { const r = await api(`/companies/${id}/payroll-runs/${run.id}/book`, { method: 'POST', body: {} }); setData(r.data); toast(r.data.voucherRef); }} /> : null}
            <Button onClick={() => window.print()}>{t('print')}</Button>
          </>
        )}
      />
      <Card className="no-print">
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('name')}</th><th className="num">{t('gross')}</th><th className="num">{t('tax')}</th><th className="num">{t('deductions')}</th><th className="num">{t('netPay')}</th><th className="num">{t('employerFee')}</th><th /></tr></thead>
            <tbody>
              {run.payslips.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.name}<br /><small className="muted">{p.personalNumber}</small></td>
                  <td className="num">{money(p.gross)}{p.additions ? <><br /><small className="muted">+{money(p.additions)}</small></> : null}</td>
                  <td className="num">{money(p.tax)}<br /><small className="muted">{percent(p.taxRate)}</small></td>
                  <td className="num">{money(p.deductions)}</td>
                  <td className="num"><b>{money(p.net)}</b></td>
                  <td className="num">{money(p.employerFee)}<br /><small className="muted">{percent(p.employerFeeRate)}</small></td>
                  <td>{draft ? <Button small variant="ghost" onClick={() => { setSlipError(null); setSlip(p); }}>{t('edit')}</Button> : null}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>{t('total')}</td><td className="num">{money(run.totals.gross)}</td><td className="num">{money(run.totals.tax)}</td><td /><td className="num">{money(run.totals.net)}</td><td className="num">{money(run.totals.employerFee)}</td><td /></tr></tfoot>
          </table>
        </div>
      </Card>
      {agi.data ? (
        <Card title={t('agi')} className="no-print">
          <p className="muted small">{agi.data.redovisningsperiod} · {agi.data.orgNumber}</p>
          <table>
            <thead><tr><th>{t('personalNumber')}</th><th>{t('name')}</th><th className="num">Ruta 011</th><th className="num">Ruta 001</th></tr></thead>
            <tbody>{agi.data.individuals.map((i: any) => <tr key={i.personalNumber}><td>{i.personalNumber}</td><td>{i.name}</td><td className="num">{i.grossPay}</td><td className="num">{i.taxWithheld}</td></tr>)}</tbody>
          </table>
          <dl className="totals">
            <dt>{t('tax')}</dt><dd>{agi.data.employer.totalTaxWithheld} kr</dd>
            <dt>{t('employerFee')}</dt><dd>{agi.data.employer.totalEmployerFees} kr</dd>
            <dt className="strong">{t('toPay')}</dt><dd className="strong">{agi.data.employer.totalToPay} kr</dd>
          </dl>
        </Card>
      ) : null}
      <div className="print-only">
        {run.payslips.map((p: any) => (
          <section key={p.id} className="payslip">
            <h2>{t('payslip')} {run.period} – {company?.name}</h2>
            <p>{p.name} · {p.personalNumber} · {t('payDate')} {run.payDate}</p>
            <dl className="totals">
              <dt>{t('monthlySalary')}</dt><dd>{kr(p.baseSalary)}</dd>
              <dt>{t('additions')}</dt><dd>{kr(p.additions)}</dd>
              <dt>{t('gross')}</dt><dd>{kr(p.gross)}</dd>
              <dt>{t('tax')} ({percent(p.taxRate)})</dt><dd>−{kr(p.tax)}</dd>
              <dt>{t('deductions')}</dt><dd>−{kr(p.deductions)}</dd>
              <dt className="strong">{t('netPay')}</dt><dd className="strong">{kr(p.net)}</dd>
            </dl>
          </section>
        ))}
      </div>
      {slip ? (
        <SlipModal slip={slip} error={slipError} onClose={() => setSlip(null)} onSave={saveSlip} />
      ) : null}
    </>
  );
}

function SlipModal({ slip, error, onClose, onSave }: { slip: any; error: unknown; onClose: () => void; onSave: (p: Record<string, unknown>) => void }) {
  const { t } = useTranslation();
  const [additions, setAdditions] = useState<number | null>(slip.additions);
  const [deductions, setDeductions] = useState<number | null>(slip.deductions);
  const [feeRate, setFeeRate] = useState(String(slip.employerFeeRate).replace('.', ','));
  return (
    <Modal title={slip.name} onClose={onClose}>
      <div className="stack">
        <Field label={t('additions')} hint="Bonus, OB, övertid (skattepliktigt)"><MoneyInput allowNegative value={additions} onChange={setAdditions} /></Field>
        <Field label={t('deductions')} hint="Avdrag efter skatt, t.ex. förskott"><MoneyInput value={deductions} onChange={setDeductions} /></Field>
        <Field label={`${t('employerFee')} (%)`} hint="31,42 % standard · 10,21 % 66+ år"><Input inputMode="decimal" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} /></Field>
        <ErrorBox error={error} />
        <div className="modal-actions">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={() => onSave({ additions: additions ?? 0, deductions: deductions ?? 0, employerFeeRate: Number(feeRate.replace(',', '.')) })}>{t('save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
