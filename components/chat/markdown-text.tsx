// MarkdownText — custom markdown renderer for AI message text.
//
// History: this component was created in commit 4ef7b6d because the AI
// Elements MessageResponse (which uses Streamdown under the hood) was
// failing silently on the client. The custom renderer has no external
// dependencies and reliably renders:
//
//   - Code blocks (```...```)
//   - Inline code (`code`)
//   - Bullet lists (- item, * item)
//   - Numbered lists (1. item)
//   - Headings (# H1, ## H2, ### H3)
//   - Bold (**bold**)
//   - Italic (*italic*)
//   - Links ([text](url))
//   - Paragraphs
//
// It is used for the final answer text in chat-message.tsx. The CoT
// and Tool components use AI Elements (which are fine for those use
// cases — it's the markdown rendering that needed a custom approach).

"use client";

import type { ReactNode } from "react";

// Inline markdown: **bold**, *italic*, `code`, [text](url)
function renderInline(text: string): ReactNode {
  // First handle inline code (so we don't process markdown inside it)
  const codeRegex = /`([^`]+)`/g;
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = codeRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(renderTextFormatting(text.slice(lastIdx, m.index), key));
      key++;
    }
    parts.push(
      <code
        key={key++}
        className="px-1 py-0.5 rounded bg-muted/50 border border-border/50 text-xs font-mono"
      >
        {m[1]}
      </code>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(renderTextFormatting(text.slice(lastIdx), key));
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderTextFormatting(text: string, key: number): ReactNode {
  // Handle **bold**, *italic*, [text](url)
  const nodes: ReactNode[] = [];
  const combined = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let subKey = 0;
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(text.slice(lastIdx, m.index));
    }
    const match = m[0];
    if (match.startsWith("**")) {
      nodes.push(<strong key={`${key}-${subKey++}`}>{match.slice(2, -2)}</strong>);
    } else if (match.startsWith("*")) {
      nodes.push(<em key={`${key}-${subKey++}`}>{match.slice(1, -1)}</em>);
    } else if (match.startsWith("[")) {
      const linkMatch = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${key}-${subKey++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

export default function MarkdownText({ text }: { text: string }) {
  // Split into blocks (paragraphs, code blocks, lists)
  const blocks = text.split(/\n\n+/);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {blocks.map((block, i) => {
        // Code block ```lang\ncode\n```
        if (block.startsWith("```")) {
          const match = block.match(/^```(\w+)?\n([\s\S]+?)\n```$/);
          if (match) {
            return (
              <pre
                key={i}
                className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto text-xs my-2"
              >
                <code className="text-foreground whitespace-pre">{match[2]}</code>
              </pre>
            );
          }
          // Fallback: unclosed code block
          return (
            <pre
              key={i}
              className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto text-xs my-2"
            >
              <code className="text-foreground whitespace-pre">
                {block.replace(/^```\w*\n?/, "").replace(/```$/, "")}
              </code>
            </pre>
          );
        }

        // Bullet list (- or *)
        if (block.match(/^[\-\*]\s/m)) {
          const items = block.split(/\n/).filter(Boolean);
          return (
            <ul key={i} className="list-disc pl-5 my-2 space-y-1">
              {items.map((item, j) => (
                <li key={j} className="text-sm leading-relaxed">
                  {renderInline(item.replace(/^[\-\*]\s/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (block.match(/^\d+\.\s/m)) {
          const items = block.split(/\n/).filter(Boolean);
          return (
            <ol key={i} className="list-decimal pl-5 my-2 space-y-1">
              {items.map((item, j) => (
                <li key={j} className="text-sm leading-relaxed">
                  {renderInline(item.replace(/^\d+\.\s/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        // Heading
        if (block.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="text-lg font-semibold mt-3 mb-2 text-foreground"
            >
              {renderInline(block.slice(2))}
            </h1>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="text-base font-semibold mt-3 mb-1 text-foreground"
            >
              {renderInline(block.slice(3))}
            </h2>
          );
        }
        if (block.startsWith("### ")) {
          return (
            <h3
              key={i}
              className="text-sm font-semibold mt-2 mb-1 text-foreground"
            >
              {renderInline(block.slice(4))}
            </h3>
          );
        }

        // Default paragraph
        return (
          <p key={i} className="text-sm leading-relaxed my-2">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
