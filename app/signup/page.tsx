// /signup — alias for the auth page (signup mode)
// Reuses the AuthPage component (which toggles between login and signup).

import AuthPage from "@/components/auth-page";

export default function SignupPage() {
  return <AuthPage />;
}
