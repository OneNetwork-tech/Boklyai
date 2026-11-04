import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { api, errorText } from '../api';
import { moneyInput, parseMoney } from '../format';

// --- Buttons & fields -----------------------------------------------------------

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; small?: boolean; busy?: boolean };

export function Button({ variant = 'secondary', small, busy, className = '', children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}${small ? ' btn-sm' : ''} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className="spinner-inline" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props}>{children}</select>;
}

/** Money input in kronor ("1 234,50") bound to an öre value. */
export function MoneyInput({ value, onChange, allowNegative = false, ...rest }: {
  value: number | null;
  onChange: (ore: number | null) => void;
  allowNegative?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(moneyInput(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setText(moneyInput(value));
      last.current = value;
    }
  }, [value]);
  const parsed = parseMoney(text);
  const invalid = text !== '' && (parsed === null || (!allowNegative && parsed < 0));
  return (
    <input
      className={`input num${invalid ? ' invalid' : ''}`}
      inputMode="decimal"
      value={text}
      aria-invalid={invalid || undefined}
      onChange={(e) => {
        setText(e.target.value);
        const v = parseMoney(e.target.value);
        last.current = v;
        onChange(v === null || (!allowNegative && v < 0) ? null : v);
      }}
      onBlur={() => { if (parsed !== null) setText(moneyInput(parsed)); }}
      {...rest}
    />
  );
}

// --- Layout bits -----------------------------------------------------------------

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title || actions ? (
        <div className="card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Spinner() {
  const { t } = useTranslation();
  return <div className="spinner" role="status" aria-label={t('loading')} />;
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return <div className="empty">{children || t('nothingHere')}</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="alert alert-error" role="alert">{errorText(error)}</div>;
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'gray', issued: 'blue', booked: 'blue', paid: 'green', credited: 'gray', overdue: 'red', unmatched: 'amber', ignored: 'gray',
  settled: 'green', open: 'blue', closed: 'gray', done: 'green', pending: 'amber', failed: 'red', unavailable: 'gray',
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const { t } = useTranslation();
  return <span className={`badge badge-${STATUS_CLASS[status] || 'gray'}`}>{label || t(status, { defaultValue: status })}</span>;
}

// --- Modal & confirm ----------------------------------------------------------------

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`modal${wide ? ' modal-wide' : ''}`} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

export function ConfirmButton({ label, message, onConfirm, variant = 'primary', disabled }: {
  label: string; message: string; onConfirm: () => Promise<void> | void; variant?: BtnProps['variant']; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} disabled={disabled}>{label}</Button>
      {open ? (
        <Modal title={label} onClose={() => setOpen(false)}>
          <p>{message}</p>
          <ErrorBox error={error} />
          <div className="modal-actions">
            <Button onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button
              variant={variant}
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

// --- Toasts --------------------------------------------------------------------------

type ToastItem = { id: number; text: string; kind: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, kind }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((i) => <div key={i.id} className={`toast toast-${i.kind}`}>{i.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// --- Data loading ----------------------------------------------------------------------

export function useApi<T = any>(path: string | null, query?: Record<string, any>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const key = path ? `${path}?${JSON.stringify(query || {})}` : null;
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    setLoading(true);
    api<{ data: T }>(path, { query })
      .then((r) => { if (!cancelled) { setData(r.data); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, setData };
}

// --- Accounts picker ------------------------------------------------------------------

export interface Account { number: number; name: string; active: boolean; vatCode: string | null; class: string }

const accountCache = new Map<number, Promise<Account[]>>();
export function useAccounts(companyId: number) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    if (!accountCache.has(companyId)) {
      accountCache.set(companyId, api<{ data: Account[] }>(`/companies/${companyId}/accounts`).then((r) => r.data).catch((e) => {
        accountCache.delete(companyId);
        throw e;
      }));
    }
    accountCache.get(companyId)!.then(setAccounts).catch(() => {});
  }, [companyId]);
  return accounts;
}
export function invalidateAccounts(companyId: number) {
  accountCache.delete(companyId);
}

export function AccountSelect({ companyId, value, onChange, filter, required, id }: {
  companyId: number; value: number | null; onChange: (n: number) => void; filter?: (a: Account) => boolean; required?: boolean; id?: string;
}) {
  const accounts = useAccounts(companyId).filter((a) => a.active && (!filter || filter(a)));
  return (
    <select id={id} className="input" value={value ?? ''} required={required} onChange={(e) => onChange(Number(e.target.value))}>
      <option value="" disabled>—</option>
      {accounts.map((a) => <option key={a.number} value={a.number}>{a.number} {a.name}</option>)}
    </select>
  );
}

export function VatSelect({ value, onChange, id }: { value: number; onChange: (v: 0 | 6 | 12 | 25) => void; id?: string }) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(Number(e.target.value) as 0 | 6 | 12 | 25)}>
      {[25, 12, 6, 0].map((r) => <option key={r} value={r}>{r} %</option>)}
    </select>
  );
}
