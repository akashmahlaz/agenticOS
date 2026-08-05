// AuthContext — shared authentication state for client components
// Replaces the deleted (app)/layout.tsx useAuth re-export.

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LS_TOKEN = "auth-token";
const LS_USER = "auth-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(LS_TOKEN);
      const savedUser = localStorage.getItem(LS_USER);
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const persistAuth = (newToken: string | null, newUser: AuthUser | null) => {
    setToken(newToken);
    setUser(newUser);
    try {
      if (newToken) localStorage.setItem(LS_TOKEN, newToken);
      else localStorage.removeItem(LS_TOKEN);
      if (newUser) localStorage.setItem(LS_USER, JSON.stringify(newUser));
      else localStorage.removeItem(LS_USER);
    } catch {}
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Login failed" };
      persistAuth(data.token, data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Signup failed" };
      persistAuth(data.token, data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  };

  const logout = () => {
    persistAuth(null, null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const refresh = async () => {
    try {
      const t = token || localStorage.getItem(LS_TOKEN);
      if (!t) return;
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) persistAuth(t, data.user);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, signup, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
