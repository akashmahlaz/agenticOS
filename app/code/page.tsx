"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CodeIcon, PlayIcon, SaveIcon, TerminalIcon, FileCodeIcon } from "lucide-react"

const sampleFiles = [
  { name: "app/api/chat/route.ts", language: "typescript", lines: 158 },
  { name: "lib/agents/orchestrator.ts", language: "typescript", lines: 320 },
  { name: "lib/memory/manager.ts", language: "typescript", lines: 480 },
  { name: "components/chat/chat-view.tsx", language: "tsx", lines: 180 },
]

const sampleCode = `// Example: sub-agent orchestration
import { tool } from "ai"
import { z } from "zod"

const researchTool = tool({
  description: "Research a topic using web search",
  inputSchema: z.object({
    query: z.string().describe("What to research"),
  }),
  execute: async ({ query }) => {
    const results = await searchWeb(query)
    return { results, query }
  },
})`

export default function CodePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CodeIcon className="size-5" />
            <div>
              <h1 className="text-lg font-semibold md:text-xl">Code Workspace</h1>
              <p className="text-sm text-muted-foreground">
                Edit, preview, and run generated code
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <SaveIcon className="mr-1.5 size-3.5" />
              Save
            </Button>
            <Button size="sm">
              <PlayIcon className="mr-1.5 size-3.5" />
              Run
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* File list */}
        <aside className="hidden w-64 border-r border-border bg-muted/20 md:block">
          <div className="border-b border-border p-3">
            <h2 className="text-sm font-medium">Files</h2>
          </div>
          <div className="space-y-1 p-2">
            {sampleFiles.map((file) => (
              <button
                key={file.name}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <FileCodeIcon className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-xs">{file.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {file.language}
                </Badge>
              </button>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border bg-muted/10 px-3 py-1.5">
            <span className="font-mono text-xs text-muted-foreground">
              lib/agents/orchestrator.ts
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono text-xs">
            <pre className="whitespace-pre-wrap text-foreground">{sampleCode}</pre>
          </div>
        </div>

        {/* Terminal */}
        <aside className="hidden w-80 border-l border-border bg-muted/20 lg:flex lg:flex-col">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <TerminalIcon className="size-4" />
            <h2 className="text-sm font-medium">Terminal</h2>
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-xs">
            <div className="text-green-500">$ npm run build</div>
            <div className="text-muted-foreground">Building...</div>
            <div className="text-muted-foreground">✓ Compiled successfully</div>
            <div className="text-muted-foreground">✓ TypeScript: 0 errors</div>
            <div className="text-muted-foreground">✓ 48 AI Elements loaded</div>
            <Separator className="my-2" />
            <div className="text-muted-foreground">$ Ready for commands</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
