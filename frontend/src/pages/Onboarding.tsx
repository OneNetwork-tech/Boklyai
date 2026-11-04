import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useSession } from '../session';
import {
  Button, Card, ErrorBox, Field, Input, Select,
} from '../components/ui';
import { LanguageToggle } from '../components/Layout';
import { today } from '../format';

export function CompanyPicker() {
  const { t } = useTranslation();
  const { companies, user, logout } = useSession();
  if (companies.length === 1) return <Navigate to={`/c/${companies[0].id}`} replace />;
  if (!companies.length) return <Navigate to="/new-company" replace />;
  return (
    <div className="centered">
      <Card title={t('chooseCompany')} actions={<LanguageToggle />}>
        <p className="muted">{user?.email}</p>
        <div className="picker">
          {companies.map((c) => (
            <Link key={c.id} to={`/c/${c.id}`} className="picker-item">
              <b>{c.name}</b>
              <span className="muted">{c.orgNumber} · {t(c.role)}</span>
            </Link>
          ))}
        </div>
        <div className="row spread">
          <Link to="/new-company">+ {t('createCompany')}</Link>
          <button type="button" className="link-btn" onClick={() => logout()}>{t('logout')}</button>
        </div>
      </Card>
    </div>
  );
}

export function NewCompanyPage() {
  const { t } = useTranslation();
  const { refresh, companies } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', orgNumber: '', address: '', postalCode: '', city: '', email: '', bankgiro: '',
    vatPeriod: 'quarterly', fiscalYearStart: `${today().slice(0, 4)}-01-01`, paymentTermsDays: '30',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...form, paymentTermsDays: Number(form.paymentTermsDays) };
      for (const k of ['address', 'postalCode', 'city', 'email', 'bankgiro']) if (!body[k]) delete body[k];
      const r = await api('/companies', { method: 'POST', body });
      await refresh();
      navigate(`/c/${r.data.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="centered">
      <Card title={t('createCompany')} actions={<LanguageToggle />} className="card-form">
        <p className="muted">{t('createCompanyIntro')}</p>
        <form className="stack" onSubmit={submit}>
          <div className="grid2">
            <Field label={t('companyName')}><Input required value={form.name} onChange={set('name')} /></Field>
            <Field label={t('orgNumber')} hint="556677-8899"><Input required value={form.orgNumber} onChange={set('orgNumber')} /></Field>
          </div>
          <Field label={t('address')}><Input value={form.address} onChange={set('address')} /></Field>
          <div className="grid2">
            <Field label={t('postalCode')}><Input value={form.postalCode} onChange={set('postalCode')} /></Field>
            <Field label={t('city')}><Input value={form.city} onChange={set('city')} /></Field>
          </div>
          <div className="grid2">
            <Field label={t('email')}><Input type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label={t('bankgiro')} hint="123-4567"><Input value={form.bankgiro} onChange={set('bankgiro')} /></Field>
          </div>
          <div className="grid3">
            <Field label={t('fiscalYearStart')}><Input type="date" required value={form.fiscalYearStart} onChange={set('fiscalYearStart')} /></Field>
            <Field label={t('vatPeriod')}>
              <Select value={form.vatPeriod} onChange={set('vatPeriod')}>
                <option value="monthly">{t('monthly')}</option>
                <option value="quarterly">{t('quarterly')}</option>
                <option value="yearly">{t('yearly')}</option>
              </Select>
            </Field>
            <Field label={t('paymentTerms')}><Input type="number" min={0} max={365} value={form.paymentTermsDays} onChange={set('paymentTermsDays')} /></Field>
          </div>
          <ErrorBox error={error} />
          <div className="row">
            <Button type="submit" variant="primary" busy={busy}>{t('create')}</Button>
            {companies.length ? <Link to="/">{t('cancel')}</Link> : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
