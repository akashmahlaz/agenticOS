"use client";

// AuthWrapper — provides authentication state to the app
//
// Auth state is stored EXCLUSIVELY in a non-HttpOnly cookie (`auth-token`).
// The cookie is set by the login/signup API routes server-side, so:
//   - The server can read it for SSR (e.g. /c/[id] page)
//   - The client can read it for Authorization headers in fetch calls
//   - It survives full page reloads (unlike in-memory state)
//   - It's automatically sent on all requests
//
// The JWT itself is verified server-side on every protected API call.
// We don't trust the client to "have" the user — we re-verify via /api/auth/me.

import {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ThemeProvider } from "@/components/theme-provider";

export const AUTH_COOKIE = "auth-token";
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7d, matches JWT expiry

export interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  setToken: Dispatch<SetStateAction<string | null>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Read a cookie value by name. Returns null if not set. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

/** Set or delete a cookie. */
function writeCookie(name: string, value: string | null): void {
  if (typeof document === "undefined") return;
  if (value) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthWrapper");
  }
  return ctx;
}

export default function AuthWrapper({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Verify the current cookie token with the server and hydrate the user.
   * Called on mount and after login/signup.
   */
  const refreshUser = async (): Promise<void> => {
    const cookieToken = readCookie(AUTH_COOKIE);
    if (!cookieToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    setToken(cookieToken);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${cookieToken}` },
        credentials: "include",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        // Token is invalid/expired — clear it
        writeCookie(AUTH_COOKIE, null);
        setToken(null);
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        writeCookie(AUTH_COOKIE, null);
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      // Network error or timeout — clear loading state so user can try again
      console.warn("[auth] refreshUser failed:", err);
      // If it's a timeout, treat as no user (force re-login)
      if (err instanceof DOMException && err.name === "TimeoutError") {
        writeCookie(AUTH_COOKIE, null);
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    // The server already set the cookie via Set-Cookie. Mirror it client-side
    // so we have it in state without an extra round-trip.
    setToken(data.token);
    setUser(data.user);
    writeCookie(AUTH_COOKIE, data.token);
  };

  const signup = async (
    email: string,
    password: string,
    name?: string
  ): Promise<void> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");
    setToken(data.token);
    setUser(data.user);
    writeCookie(AUTH_COOKIE, data.token);
  };

  const logout = async (): Promise<void> => {
    // Server-side logout endpoint clears the cookie.
    // Falls back to client-side clear if the server call fails.
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    writeCookie(AUTH_COOKIE, null);
    setToken(null);
    setUser(null);
  };

  return (
    <ThemeProvider>
      <AuthContext.Provider
        value={{
          user,
          token,
          loading,
          setToken,
          setUser,
          login,
          signup,
          logout,
          refreshUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
