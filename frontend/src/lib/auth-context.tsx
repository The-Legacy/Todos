"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@todos/shared";
import { api, ApiError } from "./api";

const TOKEN_STORAGE_KEY = "todos.authToken";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        try {
          const { user } = await api.me(stored);
          if (!cancelled) {
            setToken(stored);
            setUser(user);
          }
        } catch {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback((nextToken: string, nextUser: User) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      applySession(res.token, res.user);
    },
    [applySession],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const res = await api.signup(email, password);
      applySession(res.token, res.user);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    if (token) {
      await api.logout(token).catch((err: unknown) => {
        if (!(err instanceof ApiError)) throw err;
      });
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, signup, logout }),
    [user, token, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
