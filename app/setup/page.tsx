// Setup page — paste integration keys once and they get saved to Vercel env
// for server-wide use. Also shows which keys are already configured.

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2Icon, XCircleIcon, KeyIcon, SaveIcon, LoaderIcon } from "lucide-react";
import { useAuth } from "@/components/auth-wrapper";

const KEY_FIELDS = [
  {
    name: "ROCKETREACH_API_KEY",
    label: "RocketReach API Key",
    placeholder: "rk_live_...",
    description: "Find professional contacts (emails, phones, LinkedIn). Get it from rocketreach.co/api",
  },
  {
    name: "GITHUB_TOKEN",
    label: "GitHub Personal Access Token",
    placeholder: "ghp_... or github_pat_...",
    description: "Read/write code, manage issues. Create at github.com/settings/personal-access-tokens/new",
  },
  {
    name: "VERCEL_TOKEN",
    label: "Vercel Token",
    placeholder: "vcp_...",
    description: "Manage your Vercel deployments. Create at vercel.com/account/tokens",
  },
  {
    name: "OPENAI_API_KEY",
    label: "OpenAI API Key",
    placeholder: "sk-...",
    description: "Optional — for OpenAI-powered features. platform.openai.com/api-keys",
  },
];

export default function SetupPage() {
  const { token } = useAuth();
  const [configured, setConfigured] = useState<Record<string, { present: boolean; targets: string[] }>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, "idle" | "saving" | "ok" | "error">>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured) setConfigured(data.configured);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: string) => {
    setStatus((s) => ({ ...s, [key]: "saving" }));
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ keys: { [key]: values[key] } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setStatus((s) => ({ ...s, [key]: "ok" }));
      // Refresh configured list
      const cfg = await fetch("/api/admin/setup", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      }).then((r) => r.json());
      if (cfg.configured) setConfigured(cfg.configured);
    } catch (err) {
      console.error(err);
      setStatus((s) => ({ ...s, [key]: "error" }));
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <KeyIcon className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold">Integration Setup</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste your API keys once. They are saved to Vercel env vars and
            available to all the agent's tools (Lead Gen, Developer, etc.).
            For per-user keys, use <a href="/secrets" className="underline">/secrets</a>.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderIcon className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {KEY_FIELDS.map((field) => {
              const isConfigured = configured[field.name]?.present;
              const st = status[field.name] || "idle";
              return (
                <Card key={field.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          {field.label}
                          {isConfigured ? (
                            <CheckCircle2Icon className="size-4 text-green-500" />
                          ) : (
                            <XCircleIcon className="size-4 text-muted-foreground" />
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {field.description}
                        </CardDescription>
                      </div>
                      <code className="rounded bg-muted px-2 py-0.5 text-xs">
                        {field.name}
                      </code>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label htmlFor={field.name} className="sr-only">
                      {field.label}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={field.name}
                        type="password"
                        placeholder={
                          isConfigured ? "(already configured — paste to update)" : field.placeholder
                        }
                        value={values[field.name] || ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [field.name]: e.target.value }))
                        }
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => handleSave(field.name)}
                        disabled={!values[field.name] || st === "saving"}
                        size="sm"
                      >
                        {st === "saving" ? (
                          <LoaderIcon className="size-3.5 animate-spin" />
                        ) : (
                          <SaveIcon className="size-3.5" />
                        )}
                        Save
                      </Button>
                    </div>
                    {st === "ok" && (
                      <p className="text-xs text-green-500">✓ Saved to Vercel env</p>
                    )}
                    {st === "error" && (
                      <p className="text-xs text-red-500">✗ Failed to save</p>
                    )}
                    {isConfigured && (
                      <p className="text-xs text-muted-foreground">
                        Configured for: {configured[field.name].targets.join(", ") || "unknown"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium">How this works</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>• Keys are saved to Vercel env vars (server-wide, encrypted)</li>
            <li>• The agent's tools (Lead Gen, Developer) can use them automatically</li>
            <li>• For per-account overrides, also save to <a href="/secrets" className="underline">/secrets</a></li>
            <li>• Keys are never sent to the browser; only the server uses them</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
