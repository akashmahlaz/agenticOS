"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      token: null,
      loading: false,
      login: async () => {},
      signup: async () => {},
      logout: () => {},
      refreshUser: async () => {},
    };
  }
  return ctx;
}

export default function AuthWrapper({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem("agentic_token");
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    setToken(savedToken);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem("agentic_token");
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem("agentic_token");
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    localStorage.setItem("agentic_token", data.token);
    // Mirror to cookie so server-side pages (/c/[id]) can auth too.
    // HttpOnly is intentionally false: the JS client needs to read it for
    // Authorization headers. We mitigate risk by storing the same JWT
    // (already short-lived: 7d) in two places.
    document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    localStorage.setItem("agentic_token", data.token);
    document.cookie = `auth-token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("agentic_token");
    document.cookie = "auth-token=; path=/; max-age=0; SameSite=Lax";
    setToken(null);
    setUser(null);
  };

  // On mount, if localStorage has a token but the cookie doesn't (e.g. the
  // user logged in before this fix), mirror the token to the cookie so
  // server-side pages can authenticate them.
  useEffect(() => {
    const savedToken = localStorage.getItem("agentic_token");
    if (savedToken && !document.cookie.includes("auth-token=")) {
      document.cookie = `auth-token=${savedToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
