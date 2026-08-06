// /login — the auth page (login + signup)
// Renders the AuthPage component used by the AuthGate.
// Used by the /c/[id] redirect for unauthenticated users.

import AuthPage from "@/components/auth-page";

export default function LoginPage() {
  return <AuthPage />;
}
