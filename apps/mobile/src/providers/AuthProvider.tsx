import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { fetchMe, login as loginRequest } from '../api/auth';
import { clearAuthState, loadAuthState, persistAuthState } from '../storage/authStorage';
import type { StoredUser } from '../storage/authStorage';
import { decodeJwt } from '../utils/jwt';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  token: string | null;
  user: StoredUser | null;
  permissions: string[];
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: StoredUser | null;
  permissions: string[];
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'checking',
    token: null,
    user: null,
    permissions: [],
  });

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const { token, user, permissions } = await loadAuthState();
        if (!active) return;
        setState({
          status: token ? 'authenticated' : 'unauthenticated',
          token: token ?? null,
          user: user ?? null,
          permissions,
        });
      } catch (error) {
        console.warn('[auth] Failed to load stored auth state', error);
        if (!active) return;
        setState({
          status: 'unauthenticated',
          token: null,
          user: null,
          permissions: [],
        });
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthState();
    setState({
      status: 'unauthenticated',
      token: null,
      user: null,
      permissions: [],
    });
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (!state.token) return;
    try {
      const profile = await fetchMe(state.token);
      const permissions =
        profile?.role?.permissions?.map((permission) => permission.name) ?? [];
      await persistAuthState({
        token: state.token,
        user: state.user,
        permissions,
      });
      setState((prev) => ({
        ...prev,
        status: 'authenticated',
        permissions,
      }));
    } catch (error) {
      console.warn('[auth] Failed to refresh permissions', error);
    }
  }, [state.token, state.user]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, status: 'checking' }));

      try {
        const { accessToken, user: authUser } = await loginRequest(
          email.trim(),
          password,
        );

        const claims = decodeJwt(accessToken);

        const user: StoredUser = {
          id: authUser.id || (claims?.sub as string) || '',
          email: authUser.email || (claims?.email as string) || email,
          roleId:
            authUser.role?.id ||
            (claims?.roleId as string) ||
            state.user?.roleId ||
            '',
          roleName:
            authUser.role?.name ||
            (claims?.roleName as string | undefined) ||
            state.user?.roleName,
        };

        const profile = await fetchMe(accessToken);
        const permissions =
          profile?.role?.permissions?.map((permission) => permission.name) ??
          [];
        const derivedRoleId = profile?.role?.id ?? user.roleId;
        const derivedRoleName = profile?.role?.name ?? user.roleName;
        const normalizedUser: StoredUser = {
          ...user,
          roleId: derivedRoleId ?? '',
          roleName: derivedRoleName ?? undefined,
        };

        await persistAuthState({
          token: accessToken,
          user: normalizedUser,
          permissions,
        });

        setState({
          status: 'authenticated',
          token: accessToken,
          user: normalizedUser,
          permissions,
        });
      } catch (error) {
        console.warn('[auth] Sign in failed', error);
        await clearAuthState();
        setState({
          status: 'unauthenticated',
          token: null,
          user: null,
          permissions: [],
        });
        throw error;
      }
    },
    [state.user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      token: state.token,
      user: state.user,
      permissions: state.permissions,
      signIn,
      signOut,
      refreshPermissions,
    }),
    [state, signIn, signOut, refreshPermissions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
