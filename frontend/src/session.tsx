import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler } from './api';

export type Role = 'owner' | 'accountant' | 'member' | 'viewer';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  bankidLinked: boolean;
}

export interface CompanyRef {
  id: number;
  name: string;
  orgNumber: string;
  role: Role;
}

interface SessionState {
  loading: boolean;
  user: User | null;
  companies: CompanyRef[];
  setSession: (payload: { user: User | null; companies: CompanyRef[] }) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<CompanyRef[]>([]);

  const setSession = useCallback((p: { user: User | null; companies: CompanyRef[] }) => {
    setUser(p.user);
    setCompanies(p.companies || []);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api('/auth/session');
      setSession(me);
    } catch {
      setSession({ user: null, companies: [] });
    } finally {
      setLoading(false);
    }
  }, [setSession]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setSession({ user: null, companies: [] });
  }, [setSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => setSession({ user: null, companies: [] }));
    refresh();
  }, [refresh, setSession]);

  const value = useMemo(() => ({ loading, user, companies, setSession, refresh, logout }), [loading, user, companies, setSession, refresh, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside provider');
  return v;
}

const LEVEL: Record<Role, number> = { viewer: 0, member: 1, accountant: 2, owner: 3 };
export const can = (role: Role | undefined, min: Role) => Boolean(role) && LEVEL[role!] >= LEVEL[min];
