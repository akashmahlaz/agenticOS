// InlineQuestion — renders a structured form the agent asked for
// When the user submits, the answer is sent as a new message via onAnswer
// The agent picks up the answer and continues its task.

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SendIcon, HelpCircleIcon } from "lucide-react";

export interface QuestionField {
  /** Unique key (used in the answer JSON) */
  key: string;
  /** Human label */
  label: string;
  /** Optional help text */
  description?: string;
  /** "text" = free input, "select" = single choice from options, "multiselect" = multiple choices */
  type: "text" | "select" | "multiselect";
  /** For select/multiselect */
  options?: Array<{ value: string; label: string }>;
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  default?: string;
}

export interface Question {
  /** Optional unique id for the question (for tracking) */
  id: string;
  /** The question prompt shown to the user */
  prompt: string;
  /** Fields to fill in */
  fields: QuestionField[];
}

export interface InlineQuestionProps {
  question: Question;
  onAnswer: (answers: Record<string, string | string[]>) => void;
  disabled?: boolean;
}

export default function InlineQuestion({
  question,
  onAnswer,
  disabled,
}: InlineQuestionProps) {
  const [values, setValues] = useState<Record<string, string | string[]>>(() => {
    const init: Record<string, string | string[]> = {};
    for (const f of question.fields) {
      if (f.type === "multiselect") init[f.key] = [];
      else init[f.key] = f.default ?? "";
    }
    return init;
  });

  const setField = useCallback((key: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleMulti = useCallback((key: string, opt: string) => {
    setValues((prev) => {
      const cur = (prev[key] as string[]) || [];
      if (cur.includes(opt)) {
        return { ...prev, [key]: cur.filter((o) => o !== opt) };
      }
      return { ...prev, [key]: [...cur, opt] };
    });
  }, []);

  const handleSubmit = useCallback(() => {
    // Validate required fields
    for (const f of question.fields) {
      if (f.required) {
        const v = values[f.key];
        if (f.type === "multiselect" && (v as string[]).length === 0) return;
        if (f.type !== "multiselect" && !String(v).trim()) return;
      }
    }
    onAnswer(values);
  }, [values, question, onAnswer]);

  return (
    <div className="my-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <HelpCircleIcon className="mt-0.5 size-4 flex-shrink-0 text-primary" />
        <p className="text-sm font-medium leading-relaxed">{question.prompt}</p>
      </div>

      <div className="space-y-3">
        {question.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}

            {field.type === "text" && (
              <Textarea
                value={(values[field.key] as string) || ""}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.default}
                rows={3}
                disabled={disabled}
                className="resize-none text-sm"
              />
            )}

            {field.type === "select" && (
              <div className="flex flex-wrap gap-2">
                {field.options?.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => setField(field.key, opt.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      values[field.key] === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {field.type === "multiselect" && (
              <div className="flex flex-wrap gap-2">
                {field.options?.map((opt) => {
                  const selected = (values[field.key] as string[])?.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMulti(field.key, opt.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={disabled}
          className="gap-1.5"
        >
          <SendIcon className="size-3.5" />
          Submit
        </Button>
      </div>
    </div>
  );
}
