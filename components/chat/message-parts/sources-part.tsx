// SourcesPart — renders search results collected from sub-agents
// Uses official AI Elements Sources component
// https://elements.ai-sdk.dev/components/sources

"use client";

import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";
import { BookIcon } from "lucide-react";

export interface SourceItem {
  title?: string;
  url: string;
  snippet?: string;
  favicon?: string;
}

export interface SourcesPartProps {
  sources: SourceItem[];
  title?: string;
}

export default function SourcesPart({ sources, title }: SourcesPartProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <Sources className="not-prose mb-3">
      <SourcesTrigger count={sources.length}>
        {title ?? `Used ${sources.length} ${sources.length === 1 ? "source" : "sources"}`}
      </SourcesTrigger>
      <SourcesContent>
        {sources.map((s, i) => (
          <Source key={i} href={s.url} title={s.title ?? s.url}>
            {s.favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.favicon}
                alt=""
                className="size-4 rounded"
              />
            )}
            {!s.favicon && <BookIcon className="size-4" />}
            <span className="truncate">{s.title ?? s.url}</span>
          </Source>
        ))}
      </SourcesContent>
    </Sources>
  );
}
