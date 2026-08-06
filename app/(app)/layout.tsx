import type { ReactNode } from "react";
// Re-export useAuth from auth-wrapper for convenience
export { useAuth } from "@/components/auth-wrapper";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
