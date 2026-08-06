"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          color: "#1C1917",
          background: "#FAFAF9",
        }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            agenticOS hit an error
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#78716C", marginBottom: "1rem", maxWidth: "400px", textAlign: "center" }}>
            {error.message || "Something went wrong. Try refreshing or resetting."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                background: "#1C1917",
                color: "#FAFAF9",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => {
                try {
                  document.cookie = "auth-token=; path=/; max-age=0";
                  localStorage.clear();
                } catch {}
                window.location.href = "/";
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#1C1917",
                border: "1px solid #D6D3D1",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              Reset & Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
