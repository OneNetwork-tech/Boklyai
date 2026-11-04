import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { api } from '../api';
import { useSession } from '../session';
import { Button, ErrorBox, Field, Input, Modal } from '../components/ui';
import { LanguageToggle } from '../components/Layout';

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="auth">
      <div className="auth-aside">
        <div className="brand brand-xl">Bokly<b>AI</b></div>
        <p>{t('appTagline')}</p>
        <ul>
          <li>BAS-kontoplan, verifikationer och huvudbok</li>
          <li>Fakturor med OCR, moms och SIE4-export</li>
          <li>Bankimport med AI-förslag och lön med AGI</li>
        </ul>
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-top"><h1>{title}</h1><LanguageToggle /></div>
          {children}
        </div>
      </div>
    </div>
  );
}

function BankIdLogin({ onDone, onClose }: { onDone: (r: any) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState('');
  const [autoStart, setAutoStart] = useState('');
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let stop = false;
    const draw = (qr: string) => { if (canvas.current) QRCode.toCanvas(canvas.current, qr, { width: 220, margin: 1 }); };
    (async () => {
      try {
        const s = await api('/auth/bankid/start', { method: 'POST', body: { intent: 'login' } });
        setAutoStart(s.autoStartToken);
        draw(s.qr);
        while (!stop) {
          await new Promise((r) => setTimeout(r, 1000));
          if (stop) break;
          const q = await api('/auth/bankid/qr').catch(() => null);
          if (q) draw(q.qr);
          const c = await api('/auth/bankid/collect', { method: 'POST' });
          if (c.status === 'pending') setMessage(c.message);
          else if (c.status === 'failed') { setMessage(c.message); break; } else { onDone(c); break; }
        }
      } catch (err) {
        setError(err);
      }
    })();
    return () => {
      stop = true;
      api('/auth/bankid/cancel', { method: 'POST' }).catch(() => {});
    };
  }, [onDone]);

  return (
    <Modal title={t('loginWithBankId')} onClose={onClose}>
      <ErrorBox error={error} />
      <div className="bankid">
        <canvas ref={canvas} aria-label={t('bankIdScan')} />
        <p>{t('bankIdScan')}</p>
        {autoStart ? <a className="btn btn-secondary" href={`bankid:///?autostarttoken=${autoStart}&redirect=null`}>{t('bankIdOpen')}</a> : null}
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </Modal>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [bankid, setBankid] = useState(false);
  const [bankidEnabled, setBankidEnabled] = useState(false);

  useEffect(() => { api('/auth/bankid/status').then((r) => setBankidEnabled(r.enabled)).catch(() => {}); }, []);

  const done = (r: any) => { setSession(r); navigate('/'); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      done(await api('/auth/login', { method: 'POST', body: { email, password } }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('login')}>
      <form onSubmit={submit} className="stack">
        <Field label={t('email')}><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
        <Field label={t('password')}><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <ErrorBox error={error} />
        <Button type="submit" variant="primary" busy={busy}>{t('login')}</Button>
        {bankidEnabled ? (
          <>
            <div className="divider">{t('or')}</div>
            <Button onClick={() => setBankid(true)}>{t('loginWithBankId')}</Button>
          </>
        ) : null}
        <div className="auth-links">
          <Link to="/forgot-password">{t('forgotPassword')}</Link>
          <span>{t('noAccount')} <Link to="/register">{t('register')}</Link></span>
        </div>
      </form>
      {bankid ? <BankIdLogin onDone={done} onClose={() => setBankid(false)} /> : null}
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const { setSession } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api('/auth/register', { method: 'POST', body: form });
      setSession(r);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('register')}>
      <form onSubmit={submit} className="stack">
        <div className="grid2">
          <Field label={t('firstName')}><Input required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} /></Field>
          <Field label={t('lastName')}><Input required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} /></Field>
        </div>
        <Field label={t('email')}><Input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label={t('password')} hint={t('passwordHint')}><Input type="password" required minLength={12} autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        <ErrorBox error={error} />
        <Button type="submit" variant="primary" busy={busy}>{t('register')}</Button>
        <div className="auth-links"><span>{t('haveAccount')} <Link to="/login">{t('login')}</Link></span></div>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <AuthShell title={t('forgotPassword')}>
      {sent ? <div className="alert alert-ok">{t('resetSent')}</div> : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('/auth/password/forgot', { method: 'POST', body: { email } });
              setSent(true);
            } catch (err) { setError(err); } finally { setBusy(false); }
          }}
        >
          <Field label={t('email')}><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <ErrorBox error={error} />
          <Button type="submit" variant="primary" busy={busy}>{t('sendResetLink')}</Button>
        </form>
      )}
      <div className="auth-links"><Link to="/login">{t('back')}</Link></div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <AuthShell title={t('setNewPassword')}>
      {done ? <div className="alert alert-ok">{t('passwordUpdated')} <Link to="/login">{t('login')}</Link></div> : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('/auth/password/reset', { method: 'POST', body: { token: params.get('token') || '', newPassword: password } });
              setDone(true);
            } catch (err) { setError(err); } finally { setBusy(false); }
          }}
        >
          <Field label={t('newPassword')} hint={t('passwordHint')}><Input type="password" minLength={12} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <ErrorBox error={error} />
          <Button type="submit" variant="primary" busy={busy}>{t('save')}</Button>
        </form>
      )}
    </AuthShell>
  );
}
