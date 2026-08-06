// InlineQuestion — UI for the askUser tool
// Renders a form with text/select/multiselect fields, submits answers
// as a new user message so the agent can continue.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoaderIcon, SendIcon } from "lucide-react";

export interface InlineQuestionData {
  id: string;
  prompt: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "select" | "multiselect";
    options?: string[];
    required?: boolean;
  }>;
}

export interface InlineQuestionProps {
  question: InlineQuestionData;
  onSubmit: (answer: Record<string, string | string[]>) => void;
  disabled?: boolean;
}

export default function InlineQuestion({ question, onSubmit, disabled }: InlineQuestionProps) {
  const [values, setValues] = useState<Record<string, string | string[]>>(() => {
    const init: Record<string, string | string[]> = {};
    for (const f of question.fields) {
      init[f.name] = f.type === "multiselect" ? [] : "";
    }
    return init;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required
    for (const f of question.fields) {
      if (f.required) {
        const v = values[f.name];
        if (f.type === "multiselect" ? (v as string[]).length === 0 : !v) {
          return;
        }
      }
    }
    onSubmit(values);
  };

  const allRequiredFilled = question.fields
    .filter((f) => f.required)
    .every((f) => {
      const v = values[f.name];
      return f.type === "multiselect" ? (v as string[]).length > 0 : !!v;
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl mx-auto">
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium text-teal bg-teal/10 px-2 py-0.5 rounded-full">
          Question
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{question.prompt}</p>
      <div className="space-y-2">
        {question.fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label className="text-xs text-muted-foreground block">
              {field.label}
              {field.required && <span className="text-coral ml-0.5">*</span>}
            </label>
            {field.type === "text" && (
              <input
                type="text"
                value={values[field.name] as string}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/40 disabled:opacity-50"
                placeholder={`Enter ${field.label.toLowerCase()}…`}
              />
            )}
            {field.type === "select" && (
              <select
                value={values[field.name] as string}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/40 disabled:opacity-50"
              >
                <option value="">Select…</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {field.type === "multiselect" && (
              <div className="flex flex-wrap gap-1.5">
                {field.options?.map((opt) => {
                  const selected = (values[field.name] as string[]).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        setValues((v) => ({
                          ...v,
                          [field.name]: selected
                            ? (v[field.name] as string[]).filter((x) => x !== opt)
                            : [...(v[field.name] as string[]), opt],
                        }))
                      }
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 ${
                        selected
                          ? "bg-teal/15 border-teal/40 text-teal"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!allRequiredFilled || disabled}
          className="gap-1.5"
        >
          {disabled ? <LoaderIcon className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />}
          Submit
        </Button>
      </div>
    </form>
  );
}
