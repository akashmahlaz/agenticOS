// ToolPart — renders an AI SDK tool call (calculate, exec, etc.)
// Uses official AI Elements Tool component
// https://elements.ai-sdk.dev/components/tool

"use client";

import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  getStatusBadge,
} from "@/components/ai-elements/tool";
import type { ToolUIPart, DynamicToolUIPart } from "ai";

export type AnyToolPart = ToolUIPart | DynamicToolUIPart;

export interface ToolPartProps {
  part: AnyToolPart;
}

function isDynamicTool(part: AnyToolPart): part is DynamicToolUIPart {
  return part.type === "dynamic-tool";
}

export default function ToolPart({ part }: ToolPartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolName = isDynamicTool(part) ? (part as any).toolName : part.type.replace(/^tool-/, "");
  const state = part.state;
  const input = isDynamicTool(part) ? part.input : (part as ToolUIPart).input;
  const output = isDynamicTool(part) ? part.output : (part as ToolUIPart).output;
  const errorText = isDynamicTool(part) ? part.errorText : (part as ToolUIPart).errorText;

  return (
    <Tool className="not-prose mb-3">
      <ToolHeader
        type={part.type}
        state={state}
        toolName={isDynamicTool(part) ? toolName : undefined}
        title={toolName}
      />
      <ToolContent>
        {input !== undefined && (
          <ToolInput input={input} />
        )}
        {output !== undefined && (
          <ToolOutput
            output={output}
            errorText={errorText ?? undefined}
          />
        )}
      </ToolContent>
    </Tool>
  );
}
