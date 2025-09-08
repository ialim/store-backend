import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { gql, useApolloClient } from '@apollo/client';
import { decodeJwt } from './jwt';

export type AuthUser = { id: string; email: string; roleId: string; roleName?: string } | null;

type AuthCtx = {
  token: string | null;
  user: AuthUser;
  setAuth: (auth: { token: string | null; user: AuthUser }) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
  permissions: string[];
  hasPermission: (...perms: string[]) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const apollo = useApolloClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser>(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) return JSON.parse(rawUser) as AuthUser;
      const t = localStorage.getItem('token');
      if (!t) return null;
      const claims = decodeJwt(t);
      if (!claims) return null;
      return {
        id: (claims.sub as string) || '',
        email: (claims.email as string) || '',
        roleId: (claims.roleId as string) || '',
        roleName: (claims.roleName as string) || undefined,
      };
    } catch {
      return null;
    }
  });

  const setAuth = (auth: { token: string | null; user: AuthUser }) => {
    const { token: t } = auth;
    let { user: u } = auth;
    setToken(t);
    // If roleName is missing, try to derive from token claims
    if (t && (!u || !u.roleName)) {
      const claims = decodeJwt(t);
      if (claims) {
        const roleName = (claims.roleName as string) || undefined;
        if (u) u = { ...u, roleName };
        else
          u = {
            id: (claims.sub as string) || '',
            email: (claims.email as string) || '',
            roleId: (claims.roleId as string) || '',
            roleName,
          };
      }
    }
    setUser(u);
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
    if (!t) {
      try { localStorage.removeItem('permissions'); } catch {}
      setPermissions([]);
    }
  };

  const logout = () => setAuth({ token: null, user: null });
  const hasRole = (...roles: string[]) => !!(token && user && user.roleName && roles.includes(user.roleName));
  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('permissions');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const hasPermission = (...perms: string[]) => perms.some((p) => permissions.includes(p));

  // Fetch permissions when token changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setPermissions([]);
        return;
      }
      try {
        const ME = gql`
          query MeForPerms { me { role { permissions { name } } } }
        `;
        const res = await apollo.query({ query: ME, fetchPolicy: 'network-only' });
        if (cancelled) return;
        const list = (res.data?.me?.role?.permissions || []).map((p: any) => p.name as string);
        const unique = Array.from(new Set(list)) as string[];
        setPermissions(unique);
        try { localStorage.setItem('permissions', JSON.stringify(unique)); } catch {}
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, apollo]);

  const value = useMemo(
    () => ({ token, user, setAuth, logout, hasRole, permissions, hasPermission }),
    [token, user, permissions]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
