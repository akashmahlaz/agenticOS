"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MicIcon, PlayIcon, PauseIcon, Volume2Icon, AudioLinesIcon } from "lucide-react"
import { useState } from "react"

const sampleVoices = [
  { id: "alloy", name: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", name: "Echo", desc: "Warm, conversational" },
  { id: "shimmer", name: "Shimmer", desc: "Bright, energetic" },
  { id: "onyx", name: "Onyx", desc: "Deep, authoritative" },
]

const sampleTranscripts = [
  { time: "00:00", text: "Hello, how can I help you today?" },
  { time: "00:03", text: "I need help with my TypeScript project." },
  { time: "00:07", text: "Sure! What are you trying to build?" },
  { time: "00:11", text: "A full-stack agentic AI platform." },
]

export default function VoicePage() {
  const [recording, setRecording] = useState(false)
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MicIcon className="size-5" />
            <div>
              <h1 className="text-lg font-semibold md:text-xl">Voice Mode</h1>
              <p className="text-sm text-muted-foreground">
                Real-time voice conversations with AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={recording ? "destructive" : "default"}
              onClick={() => setRecording(!recording)}
            >
              <MicIcon className="mr-1.5 size-3.5" />
              {recording ? "Stop" : "Record"}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-3 md:p-6">
        {/* Voice selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voices</CardTitle>
            <CardDescription>Choose a voice persona</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sampleVoices.map((voice) => (
              <button
                key={voice.id}
                className="flex w-full items-center justify-between rounded-md border border-border p-2 text-left hover:bg-muted/50"
              >
                <div>
                  <div className="text-sm font-medium">{voice.name}</div>
                  <div className="text-xs text-muted-foreground">{voice.desc}</div>
                </div>
                <Volume2Icon className="size-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Live waveform */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Audio</CardTitle>
            <CardDescription>
              {recording ? "Recording..." : "Press record to start"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center rounded-md bg-muted/30">
              {recording ? (
                <div className="flex items-end gap-1">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 animate-pulse rounded-full bg-primary"
                      style={{
                        height: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <AudioLinesIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>00:00</span>
              <Badge variant="secondary">{recording ? "Live" : "Idle"}</Badge>
              <span>02:30</span>
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript</CardTitle>
            <CardDescription>Real-time text</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sampleTranscripts.map((t, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-xs text-muted-foreground">{t.time}</span>
                <span>{t.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
