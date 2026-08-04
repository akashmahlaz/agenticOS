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
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("agentic_token");
    setToken(null);
    setUser(null);
  };

  return (
    <ThemeProvider>
      <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
