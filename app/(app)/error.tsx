"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/(app)] Error:", error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold">Chat failed to load</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "Try resetting your session."}
        </p>
        <Button
          onClick={() => {
            try {
              document.cookie = "auth-token=; path=/; max-age=0";
              localStorage.clear();
            } catch {}
            window.location.href = "/";
          }}
          className="w-full"
        >
          Reset & Reload
        </Button>
      </div>
    </div>
  );
}
