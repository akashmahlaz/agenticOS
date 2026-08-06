"use client";

// Global error boundary — shows a useful error message instead of
// Chrome's generic "This page couldn't load" page

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging
    console.error("[app] Error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-coral/10">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Try refreshing the page."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button
            onClick={() => {
              try {
                // Clear all auth + state, then reload
                document.cookie = "auth-token=; path=/; max-age=0";
                localStorage.clear();
              } catch {}
              window.location.href = "/";
            }}
            variant="outline"
          >
            Reset & Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
