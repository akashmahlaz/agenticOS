"use client";

import { useState } from "react";
import { useAuth } from "@/app/(app)/layout";

// ──────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 3L15.8 9.8L22 10.4L17 14.8L18.2 21.5L14 18L9.8 21.5L11 14.8L6 10.4L12.2 9.8L14 3Z" fill="currentColor"/>
  </svg>
);

// ──────────────────────────────────────────────
// Auth Page
// ──────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, name || undefined);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1C1917] flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 text-white mb-2">
            <SparkleIcon />
            <span className="text-xl font-semibold">agenticOS</span>
          </div>
          <p className="text-[#A8A29E] text-sm">v1.0 · Powered by MiniMax M2</p>
        </div>

        <div>
          <h2 className="text-3xl font-semibold text-white mb-4 leading-tight">
            Your autonomous<br />AI agent platform
          </h2>
          <ul className="space-y-3 text-[#A8A29E] text-sm">
            {[
              "Chain-of-thought reasoning with full transparency",
              "Web search, calculations, URL fetching",
              "Deep research across multiple sources",
              "Persistent chat history with sessions",
              "Professional workspace interface",
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[#57534E] text-xs">
          Built with Next.js 16 · Vercel AI SDK · Neon PostgreSQL
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-[#1C1917] mb-8">
            <span className="text-[#1C1917]"><SparkleIcon /></span>
            <span className="text-lg font-semibold">agenticOS</span>
          </div>

          <h1 className="text-2xl font-semibold text-[#1C1917] mb-1">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-[#78716C] mb-8">
            {mode === "login"
              ? "Sign in to continue to your agentic workspace"
              : "Start your autonomous AI agent workspace"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Akash Mahla"
                  className="w-full px-4 py-3 text-sm border border-[#E7E5E4] rounded-xl bg-white text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#A8A29E] focus:ring-1 focus:ring-[#D6D3D1] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 text-sm border border-[#E7E5E4] rounded-xl bg-white text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#A8A29E] focus:ring-1 focus:ring-[#D6D3D1] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                required
                className="w-full px-4 py-3 text-sm border border-[#E7E5E4] rounded-xl bg-white text-[#1C1917] placeholder:text-[#A8A29E] outline-none focus:border-[#A8A29E] focus:ring-1 focus:ring-[#D6D3D1] transition-all"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1C1917] text-white rounded-xl text-sm font-medium hover:bg-[#292524] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                mode === "login" ? "Sign in" : "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
