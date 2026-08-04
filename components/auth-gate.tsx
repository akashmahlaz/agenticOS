"use client";

import { useAuth } from "@/app/(app)/layout";
import AuthPage from "@/components/auth-page";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#78716C]">Loading agenticOS…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
