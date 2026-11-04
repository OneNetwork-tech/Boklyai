import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { api } from '../api';
import { useCompany } from '../components/Layout';
import {
  Badge, Button, Card, ConfirmButton, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner, useApi, useToast,
} from '../components/ui';
import { dateTime, kr } from '../format';
import { can, useSession } from '../session';

function CompanyForm() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const { refresh } = useSession();
  const toast = useToast();
  const { data } = useApi<any>(`/companies/${id}`);
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!form) return <Spinner />;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const disabled = !can(role, 'owner');
  return (
    <form className="stack" onSubmit={async (e) => {
      e.preventDefault();
      setError(null);
      try {
        const { name, vatNumber, address, postalCode, city, email, phone, bankgiro, plusgiro, iban, bic, vatPeriod } = form;
        await api(`/companies/${id}`, {
          method: 'PATCH',
          body: { name, vatNumber, address, postalCode, city, email, phone, bankgiro, plusgiro, iban, bic, vatPeriod, paymentTermsDays: Number(form.paymentTermsDays) },
        });
        await refresh();
        toast(t('saved'));
      } catch (err) { setError(err); }
    }}>
      <fieldset disabled={disabled} className="stack">
        <div className="grid2">
          <Field label={t('companyName')}><Input value={form.name} onChange={set('name')} /></Field>
          <Field label={t('orgNumber')}><Input value={form.orgNumber} readOnly /></Field>
          <Field label={t('vatNumber')}><Input value={form.vatNumber || ''} onChange={set('vatNumber')} /></Field>
          <Field label={t('email')}><Input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label={t('address')}><Input value={form.address} onChange={set('address')} /></Field>
          <Field label={t('phone')}><Input value={form.phone} onChange={set('phone')} /></Field>
          <Field label={t('postalCode')}><Input value={form.postalCode} onChange={set('postalCode')} /></Field>
          <Field label={t('city')}><Input value={form.city} onChange={set('city')} /></Field>
          <Field label={t('bankgiro')}><Input value={form.bankgiro} onChange={set('bankgiro')} /></Field>
          <Field label={t('plusgiro')}><Input value={form.plusgiro} onChange={set('plusgiro')} /></Field>
          <Field label="IBAN"><Input value={form.iban} onChange={set('iban')} /></Field>
          <Field label="BIC"><Input value={form.bic} onChange={set('bic')} /></Field>
          <Field label={t('vatPeriod')}>
            <Select value={form.vatPeriod} onChange={set('vatPeriod')}>
              <option value="monthly">{t('monthly')}</option><option value="quarterly">{t('quarterly')}</option><option value="yearly">{t('yearly')}</option>
            </Select>
          </Field>
          <Field label={t('paymentTerms')}><Input type="number" min={0} max={365} value={form.paymentTermsDays} onChange={set('paymentTermsDays')} /></Field>
        </div>
        <ErrorBox error={error} />
        {!disabled ? <div><Button type="submit" variant="primary">{t('save')}</Button></div> : null}
      </fieldset>
    </form>
  );
}

function FiscalYears() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const toast = useToast();
  const fys = useApi<any[]>(`/companies/${id}/fiscal-years`);
  const company = useApi<any>(`/companies/${id}`);
  const [lock, setLock] = useState('');
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (company.data) setLock(company.data.lockedUntil || ''); }, [company.data]);
  return (
    <div className="stack">
      <ErrorBox error={error} />
      {!fys.data ? <Spinner /> : (
        <table>
          <thead><tr><th>{t('fiscalYears')}</th><th>{t('vouchers')}</th><th>{t('status')}</th><th /></tr></thead>
          <tbody>
            {fys.data.map((f, i) => (
              <tr key={f.id}>
                <td>{f.startDate} – {f.endDate}</td><td>{f.voucherCount}</td>
                <td><Badge status={f.closed ? 'closed' : 'open'} label={f.closed ? t('closed') : t('open')} /></td>
                <td>
                  {!f.closed && can(role, 'owner') && fys.data!.slice(i + 1).every((x) => x.closed) ? (
                    <ConfirmButton variant="secondary" label={t('closeYear')} message={t('closeYearConfirm')} onConfirm={async () => {
                      const r = await api(`/companies/${id}/fiscal-years/${f.id}/close`, { method: 'POST' });
                      toast(`${t('netResult')}: ${kr(r.data.result)}`);
                      fys.reload();
                      company.reload();
                    }} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {can(role, 'accountant') ? (
        <div><Button small onClick={async () => { try { await api(`/companies/${id}/fiscal-years`, { method: 'POST' }); fys.reload(); } catch (err) { setError(err); } }}>{t('createNextYear')}</Button></div>
      ) : null}
      <Field label={t('lockPeriod')} hint={t('lockHint')}>
        <div className="row nowrap">
          <Input type="date" value={lock} onChange={(e) => setLock(e.target.value)} disabled={!can(role, 'owner')} />
          {can(role, 'owner') ? (
            <Button onClick={async () => {
              setError(null);
              try { await api(`/companies/${id}/lock`, { method: 'PUT', body: { lockedUntil: lock || null } }); toast(t('saved')); } catch (err) { setError(err); }
            }}>{t('save')}</Button>
          ) : null}
        </div>
      </Field>
    </div>
  );
}

function Members() {
  const { t } = useTranslation();
  const { id, role } = useCompany();
  const { user } = useSession();
  const { data, reload, error } = useApi<any[]>(`/companies/${id}/members`);
  const [full, setFull] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('accountant');
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    api(`/companies/${id}/members`).then(setFull).catch(() => {});
  }, [id, data]);
  const owner = can(role, 'owner');
  return (
    <div className="stack">
      <ErrorBox error={error || err} />
      {!data ? <Spinner /> : (
        <table>
          <thead><tr><th>{t('email')}</th><th>{t('name')}</th><th>{t('role')}</th><th /></tr></thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.userId}>
                <td>{m.email}</td><td>{m.name}</td>
                <td>
                  {owner && m.userId !== user?.id ? (
                    <select className="input w-auto" value={m.role} onChange={async (e) => {
                      setErr(null);
                      try { await api(`/companies/${id}/members/${m.userId}`, { method: 'PATCH', body: { role: e.target.value } }); reload(); } catch (x) { setErr(x); }
                    }}>
                      {['owner', 'accountant', 'member', 'viewer'].map((r) => <option key={r} value={r}>{t(r)}</option>)}
                    </select>
                  ) : t(m.role)}
                </td>
                <td>{owner && m.userId !== user?.id ? <ConfirmButton variant="ghost" label={t('delete')} message={`${t('delete')} ${m.email}?`} onConfirm={async () => { await api(`/companies/${id}/members/${m.userId}`, { method: 'DELETE' }); reload(); }} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {owner && full?.invitations?.length ? (
        <>
          <h3>{t('pendingInvites')}</h3>
          <ul className="list">{full.invitations.map((i: any) => (
            <li key={i.id}><span>{i.email} · {t(i.role)}</span><Button small variant="ghost" onClick={async () => { await api(`/companies/${id}/invitations/${i.id}`, { method: 'DELETE' }); reload(); }}>{t('delete')}</Button></li>
          ))}</ul>
        </>
      ) : null}
      {owner ? (
        <form className="row" onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try { await api(`/companies/${id}/members`, { method: 'POST', body: { email, role: newRole } }); setEmail(''); reload(); } catch (x) { setErr(x); }
        }}>
          <Input type="email" required placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="input w-auto" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            {['accountant', 'member', 'viewer', 'owner'].map((r) => <option key={r} value={r}>{t(r)}</option>)}
          </select>
          <Button type="submit" variant="primary">{t('invite')}</Button>
        </form>
      ) : null}
    </div>
  );
}

function AuditLog() {
  const { t } = useTranslation();
  const { id } = useCompany();
  const { data, error } = useApi<any[]>(`/companies/${id}/audit-log`);
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  return (
    <div className="table-wrap">
      <table className="small">
        <thead><tr><th>{t('date')}</th><th>{t('email')}</th><th>{t('actions')}</th><th /></tr></thead>
        <tbody>{data.map((a) => <tr key={a.id}><td className="nowrap">{dateTime(a.createdAt)}</td><td>{a.user}</td><td>{a.action}</td><td className="muted">{a.details ? JSON.stringify(a.details) : ''}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function LinkBankId({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let stop = false;
    const draw = (qr: string) => canvas.current && QRCode.toCanvas(canvas.current, qr, { width: 220, margin: 1 });
    (async () => {
      try {
        const s = await api('/auth/bankid/start', { method: 'POST', body: { intent: 'link' } });
        draw(s.qr);
        while (!stop) {
          await new Promise((r) => setTimeout(r, 1000));
          if (stop) break;
          const q = await api('/auth/bankid/qr').catch(() => null);
          if (q) draw(q.qr);
          const c = await api('/auth/bankid/collect', { method: 'POST' });
          if (c.status === 'pending') setMessage(c.message);
          else if (c.status === 'failed') { setMessage(c.message); break; } else { onDone(); break; }
        }
      } catch (err) { setError(err); }
    })();
    return () => { stop = true; };
  }, [onDone]);
  return (
    <Modal title={t('linkBankId')} onClose={onClose}>
      <ErrorBox error={error} />
      <div className="bankid"><canvas ref={canvas} /><p>{t('bankIdScan')}</p>{message ? <p className="muted">{message}</p> : null}</div>
    </Modal>
  );
}

function MyAccount() {
  const { t } = useTranslation();
  const { user, refresh } = useSession();
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [bankid, setBankid] = useState(false);
  const [bankidEnabled, setBankidEnabled] = useState(false);
  useEffect(() => { api('/auth/bankid/status').then((r) => setBankidEnabled(r.enabled)).catch(() => {}); }, []);
  return (
    <div className="stack">
      <p>{user?.firstName} {user?.lastName} · {user?.email}</p>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try { await api('/auth/password/change', { method: 'POST', body: { currentPassword: cur, newPassword: next } }); setCur(''); setNext(''); toast(t('saved')); } catch (err) { setError(err); }
      }}>
        <h3>{t('changePassword')}</h3>
        <div className="grid2">
          <Field label={t('currentPassword')}><Input type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
          <Field label={t('newPassword')} hint={t('passwordHint')}><Input type="password" autoComplete="new-password" minLength={12} required value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        </div>
        <ErrorBox error={error} />
        <div><Button type="submit">{t('changePassword')}</Button></div>
      </form>
      {bankidEnabled ? (
        user?.bankidLinked ? <p><Badge status="paid" label={t('bankIdLinked')} /></p> : <div><Button onClick={() => setBankid(true)}>{t('linkBankId')}</Button></div>
      ) : null}
      {bankid ? <LinkBankId onClose={() => setBankid(false)} onDone={() => { setBankid(false); refresh(); toast(t('bankIdLinked')); }} /> : null}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { role } = useCompany();
  const [tab, setTab] = useState('company');
  const tabs: [string, string][] = [['company', t('company')], ['years', t('fiscalYears')], ['members', t('members')], ['me', t('myAccount')]];
  if (can(role, 'accountant')) tabs.splice(3, 0, ['audit', t('auditLog')]);
  return (
    <>
      <PageHeader title={t('settings')} />
      <div className="tabs">{tabs.map(([k, label]) => <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>)}</div>
      <Card>
        {tab === 'company' ? <CompanyForm /> : null}
        {tab === 'years' ? <FiscalYears /> : null}
        {tab === 'members' ? <Members /> : null}
        {tab === 'audit' ? <AuditLog /> : null}
        {tab === 'me' ? <MyAccount /> : null}
      </Card>
    </>
  );
}
