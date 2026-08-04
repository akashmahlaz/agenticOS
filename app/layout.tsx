// Root layout — server component with metadata
import "./globals.css";
import type { Metadata } from "next";
import AuthWrapper from "@/components/auth-wrapper";

export const metadata: Metadata = {
  title: "agenticOS — Autonomous AI Agent",
  description: "AI agent powered by MiniMax M2 with chain-of-thought reasoning and tool use.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
