// AgentPlan — shows the agent's plan as a collapsible Plan card.
// Uses official AI Elements Plan / PlanHeader / PlanTitle / PlanDescription
// / PlanAction / PlanTrigger / PlanContent.
// https://elements.ai-sdk.dev/components/plan
//
// Pattern follows the official docs exactly. The Plan component itself
// manages the collapsible state via Collapsible. We provide the title
// and description as required strings, and render the plan body
// (numbered steps) inside PlanContent.

"use client";

import {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanContent,
  PlanTrigger,
  PlanAction,
} from "@/components/ai-elements/plan";
import { CheckIcon, CircleIcon } from "lucide-react";

export interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "complete" | "error";
}

export interface AgentPlanProps {
  title: string;
  description?: string;
  steps: PlanStep[];
  isStreaming?: boolean;
}

export default function AgentPlan({
  title,
  description,
  steps,
  isStreaming = false,
}: AgentPlanProps) {
  if (steps.length === 0) return null;

  const allComplete = steps.every((s) => s.status === "complete");

  return (
    <Plan defaultOpen={!allComplete} isStreaming={isStreaming} className="mb-3 not-prose">
      <PlanHeader>
        <div className="space-y-1.5 flex-1 min-w-0">
          <PlanTitle>{title}</PlanTitle>
          {description && <PlanDescription>{description}</PlanDescription>}
        </div>
        <PlanAction>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      <PlanContent>
        <ol className="space-y-2 my-2">
          {steps.map((step, idx) => (
            <li key={step.id} className="flex items-start gap-2.5 text-sm">
              <div className="flex-shrink-0 mt-0.5">
                {step.status === "complete" ? (
                  <CheckIcon className="size-4 text-success" />
                ) : step.status === "in-progress" ? (
                  <CircleIcon className="size-4 text-teal animate-pulse fill-teal/30" />
                ) : step.status === "error" ? (
                  <CircleIcon className="size-4 text-destructive" />
                ) : (
                  <CircleIcon className="size-4 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={
                    step.status === "complete"
                      ? "font-medium line-through text-muted-foreground"
                      : "font-medium text-foreground"
                  }
                >
                  <span className="text-muted-foreground/60 text-xs mr-1.5">{idx + 1}.</span>
                  {step.title}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </PlanContent>
    </Plan>
  );
}
