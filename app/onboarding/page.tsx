// @ts-nocheck
// Onboarding wizard — first-time setup
// Collects: name, role, initial preferences
// Creates: USER.md, SOUL.md, IDENTITY.md, profile entries

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserIcon,
  BriefcaseIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
} from "lucide-react";

const PREFERENCE_TEMPLATES = [
  "I prefer concise, bullet-point responses over long paragraphs",
  "Always use TypeScript for new code",
  "I like seeing code first, then explanations",
  "Never use placeholder or stub responses",
  "Default to the latest stable versions of libraries",
  "Use Tailwind CSS for styling",
  "Be direct — no filler or sycophancy",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [customPref, setCustomPref] = useState("");
  const [saving, setSaving] = useState(false);

  function togglePref(pref: string) {
    setSelectedPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  }

  async function finish() {
    setSaving(true);
    const allPrefs = customPref
      ? [...selectedPrefs, customPref]
      : selectedPrefs;

    try {
      const res = await fetch("/api/personalization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          role: role || undefined,
          preferences: allPrefs,
        }),
      });
      if (res.ok) {
        router.push("/?welcome=1");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step
                  ? "w-8 bg-primary"
                  : s < step
                  ? "w-8 bg-success"
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <UserIcon size={22} className="text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Hi, I'm agenticOS
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Let's set things up so I can be useful from day one. What should
                I call you?
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <div className="flex items-center justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Next
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <BriefcaseIcon size={22} className="text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                What do you do?
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                This helps me tailor answers to your context.
              </p>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Full-stack developer, Product designer, Founder…"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl hover:bg-muted text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Next
                  <ArrowRightIcon size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <SparklesIcon size={22} className="text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                How do you like me to behave?
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                Pick a few defaults. You can change these anytime.
              </p>
              <div className="space-y-2 mb-4">
                {PREFERENCE_TEMPLATES.map((pref) => {
                  const selected = selectedPrefs.includes(pref);
                  return (
                    <button
                      key={pref}
                      onClick={() => togglePref(pref)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                        selected
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/30 hover:bg-muted/50 border-transparent"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selected ? "bg-primary text-primary-foreground" : "border"
                        }`}
                      >
                        {selected && <CheckIcon size={12} />}
                      </div>
                      <span>{pref}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customPref}
                onChange={(e) => setCustomPref(e.target.value)}
                placeholder="Add your own (optional)"
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl hover:bg-muted text-sm"
                >
                  Back
                </button>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Setting up…" : "Finish setup"}
                  {!saving && <CheckIcon size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Step {step} of 3 · Takes about 30 seconds
        </p>
      </div>
    </div>
  );
}
