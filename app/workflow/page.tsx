"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WorkflowIcon, PlayIcon, GitBranchIcon, ZapIcon, CheckCircle2Icon } from "lucide-react"

const sampleWorkflows = [
  {
    id: "1",
    name: "Research → Code → Test",
    description: "Full software dev cycle with sub-agents",
    steps: ["Researcher", "Coder", "Tester"],
    active: true,
  },
  {
    id: "2",
    name: "Memory Consolidation",
    description: "Auto-dreaming pipeline",
    steps: ["Memory Keeper", "Dreamer", "Reflect"],
    active: false,
  },
  {
    id: "3",
    name: "Knowledge Ingest",
    description: "Document → chunks → embeddings",
    steps: ["Browser", "Chunker", "Embedder"],
    active: false,
  },
]

const recentRuns = [
  { id: "r1", workflow: "Research → Code → Test", status: "success", time: "2m ago" },
  { id: "r2", workflow: "Knowledge Ingest", status: "success", time: "10m ago" },
  { id: "r3", workflow: "Memory Consolidation", status: "running", time: "1h ago" },
]

export default function WorkflowPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WorkflowIcon className="size-5" />
            <div>
              <h1 className="text-lg font-semibold md:text-xl">Workflows</h1>
              <p className="text-sm text-muted-foreground">
                Chain sub-agents into repeatable flows
              </p>
            </div>
          </div>
          <Button size="sm">
            <ZapIcon className="mr-1.5 size-3.5" />
            New workflow
          </Button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 md:p-6">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Active workflows</h2>
          {sampleWorkflows.map((wf) => (
            <Card key={wf.id} className={wf.active ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{wf.name}</CardTitle>
                    <CardDescription>{wf.description}</CardDescription>
                  </div>
                  {wf.active && <Badge>Active</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {wf.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="secondary">{step}</Badge>
                      {i < wf.steps.length - 1 && (
                        <GitBranchIcon className="size-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline">
                    <PlayIcon className="mr-1.5 size-3.5" />
                    Run
                  </Button>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Recent runs</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    {run.status === "success" ? (
                      <CheckCircle2Icon className="size-4 text-green-500" />
                    ) : (
                      <div className="size-2 animate-pulse rounded-full bg-yellow-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{run.workflow}</div>
                      <div className="text-xs text-muted-foreground">{run.time}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{run.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
