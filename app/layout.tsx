import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "agenticOS — AI Agent powered by MiniMax M2",
  description:
    "An autonomous AI agent built with Vercel AI SDK, MiniMax M2, chain-of-thought reasoning, and tool calling.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
