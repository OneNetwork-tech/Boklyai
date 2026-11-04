import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { can, useSession } from '../session';
import { setLanguage } from '../i18n';

export function useCompany() {
  const { companyId } = useParams();
  const { companies } = useSession();
  const id = Number(companyId);
  const company = companies.find((c) => c.id === id);
  return { id, company, role: company?.role, base: `/c/${id}` };
}

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'sv' ? 'en' : 'sv';
  return (
    <button type="button" className="lang-toggle" onClick={() => setLanguage(next)} aria-label="Language">
      {next === 'en' ? 'English' : 'Svenska'}
    </button>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, companies, logout } = useSession();
  const { id, company, role, base } = useCompany();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (companies.length && !company) navigate('/', { replace: true });
  }, [companies, company, navigate]);

  if (!company) return null;

  const link = (to: string, label: string, end = false) => (
    <NavLink to={`${base}${to}`} end={end} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
  );

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen((o) => !o)}>☰</button>
        <span className="brand">Bokly<b>AI</b></span>
        <span className="topbar-company">{company.name}</span>
      </header>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand brand-side">Bokly<b>AI</b></div>
        <select
          className="company-switch"
          value={id}
          aria-label={t('switchCompany')}
          onChange={(e) => (e.target.value === 'new' ? navigate('/new-company') : navigate(`/c/${e.target.value}`))}
        >
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="new">+ {t('createCompany')}</option>
        </select>
        <nav>
          {link('', t('dashboard'), true)}
          <div className="nav-group">{t('sales')}</div>
          {link('/invoices', t('invoices'))}
          {link('/customers', t('customers'))}
          <div className="nav-group">{t('purchases')}</div>
          {link('/bills', t('bills'))}
          {link('/suppliers', t('suppliers'))}
          {link('/documents', t('documents'))}
          <div className="nav-group">{t('accounting')}</div>
          {link('/bank', t('bank'))}
          {link('/vouchers', t('vouchers'))}
          {link('/reports', t('reports'))}
          {link('/vat', t('vatReturn'))}
          {can(role, 'accountant') ? link('/payroll', t('payroll')) : null}
          {link('/accounts', t('accounts'))}
          {link('/settings', t('settings'))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-line" title={user?.email}>{user?.firstName} {user?.lastName}<small>{t(role || 'viewer')}</small></div>
          <div className="row">
            <LanguageToggle />
            <button type="button" className="link-btn" onClick={() => logout().then(() => navigate('/login'))}>{t('logout')}</button>
          </div>
        </div>
      </aside>
      {open ? <div className="scrim" onClick={() => setOpen(false)} aria-hidden /> : null}
      <main className="main"><Outlet /></main>
    </div>
  );
}
