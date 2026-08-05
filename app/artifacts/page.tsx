"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileTextIcon, CodeIcon, ImageIcon, FileJsonIcon } from "lucide-react"

const sampleArtifacts = [
  {
    id: "1",
    title: "API Specification",
    type: "schema",
    description: "OpenAPI spec for /api/chat endpoint",
    updated: "2 minutes ago",
  },
  {
    id: "2",
    title: "Generated TypeScript Client",
    type: "code",
    description: "Auto-generated fetch wrapper with types",
    updated: "5 minutes ago",
  },
  {
    id: "3",
    title: "Architecture Diagram",
    type: "image",
    description: "System architecture with sub-agents",
    updated: "10 minutes ago",
  },
  {
    id: "4",
    title: "Memory Snapshot",
    type: "json",
    description: "Current MEMORY.md and SOUL.md contents",
    updated: "1 hour ago",
  },
]

const typeIcons = {
  schema: FileJsonIcon,
  code: CodeIcon,
  image: ImageIcon,
  json: FileTextIcon,
} as const

export default function ArtifactsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold md:text-xl">Artifacts</h1>
            <p className="text-sm text-muted-foreground">
              Generated code, schemas, diagrams, and exports
            </p>
          </div>
          <Button size="sm">New artifact</Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-3">
          {sampleArtifacts.map((artifact) => {
            const Icon = typeIcons[artifact.type as keyof typeof typeIcons]
            return (
              <Card key={artifact.id} className="hover:bg-muted/30 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{artifact.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {artifact.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary">{artifact.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {artifact.updated}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      Copy
                    </Button>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
