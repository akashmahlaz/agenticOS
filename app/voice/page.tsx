// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(app)/layout";
import AuthGate from "@/components/auth-gate";
import Sidebar from "@/components/chat/sidebar";

// AI Elements
import { MicSelector, MicSelectorTrigger, MicSelectorContent, MicSelectorInput, MicSelectorList, MicSelectorEmpty, MicSelectorItem } from "@/components/ai-elements/mic-selector";
import { VoiceSelector, VoiceSelectorTrigger, VoiceSelectorContent, VoiceSelectorInput, VoiceSelectorList, VoiceSelectorEmpty, VoiceSelectorItem } from "@/components/ai-elements/voice-selector";
import { AudioPlayer, AudioPlayerElement, AudioPlayerPlayButton, AudioPlayerTimeDisplay, AudioPlayerDurationDisplay, AudioPlayerTimeRange, AudioPlayerMuteButton } from "@/components/ai-elements/audio-player";
import { Transcription, TranscriptionSegment } from "@/components/ai-elements/transcription";
import { SpeechInput, SpeechInputForm, SpeechInputValue, SpeechInputSubmit, SpeechInputRecording, SpeechInputControls, SpeechInputControl, SpeechInputLabel, SpeechInputMuted, SpeechInputActive, SpeechInputPlaceholder, SpeechInputHint } from "@/components/ai-elements/speech-input";
import { Persona } from "@/components/ai-elements/persona";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

import { MenuIcon, MicIcon, Volume2Icon, StopCircleIcon, PlayIcon, PauseIcon } from "lucide-react";

export default function VoicePage() {
  return (
    <AuthGate>
      <VoicePageContent />
    </AuthGate>
  );
}

function VoicePageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [micId, setMicId] = useState("default");
  const [voiceId, setVoiceId] = useState("alloy");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setTranscript("Listening...");
  }, []);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    setLoading(true);
    setTranscript("User said: Hello, what can you do?");
    setAiResponse("");

    setTimeout(() => {
      setAiResponse(
        "I'm an autonomous AI agent powered by MiniMax M2. I can help you with research, code, calculations, and much more — all through voice. Try asking me anything!"
      );
      setAiAudioUrl("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
      setLoading(false);
    }, 1500);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          activeSessionId={null}
          onSelectSession={() => router.push("/")}
          onNewChat={() => router.push("/")}
          refreshKey={0}
        />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in" />
      )}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 transform transition-transform duration-300 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar
          activeSessionId={null}
          onSelectSession={() => { setDrawerOpen(false); router.push("/"); }}
          onNewChat={() => { setDrawerOpen(false); router.push("/"); }}
          onClose={() => setDrawerOpen(false)}
          refreshKey={0}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 md:px-5 h-12 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur-md z-20">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-foreground"
            aria-label="Open menu"
          >
            <MenuIcon size={18} />
          </button>
          <div className="flex items-center gap-2">
            <MicIcon size={16} className="text-primary" />
            <h1 className="text-sm font-semibold font-heading">Voice Mode</h1>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-w-3xl mx-auto w-full">
          {/* Persona */}
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal to-coral flex items-center justify-center text-white text-base font-semibold">
              AO
            </div>
            <div>
              <Persona>agenticOS</Persona>
              <p className="text-xs text-muted-foreground">Voice assistant powered by MiniMax M2</p>
            </div>
          </div>

          {/* Settings: Mic + Voice selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Microphone</h3>
              <MicSelector>
                <MicSelectorTrigger className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border text-sm">
                  <span className="font-medium">{micId}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </MicSelectorTrigger>
                <MicSelectorContent>
                  <MicSelectorInput placeholder="Search microphones..." />
                  <MicSelectorList>
                    <MicSelectorEmpty>No microphones found.</MicSelectorEmpty>
                    <MicSelectorGroup>
                      <MicSelectorItem value="default" onSelect={() => setMicId("default")}>
                        <span>Default Microphone</span>
                        <MicSelectorShortcut>⌘M</MicSelectorShortcut>
                      </MicSelectorItem>
                      <MicSelectorItem value="external" onSelect={() => setMicId("external")}>
                        <span>External USB Mic</span>
                      </MicSelectorItem>
                    </MicSelectorGroup>
                  </MicSelectorList>
                </MicSelectorContent>
              </MicSelector>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Voice</h3>
              <VoiceSelector>
                <VoiceSelectorTrigger className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border text-sm">
                  <span className="font-medium">{voiceId}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </VoiceSelectorTrigger>
                <VoiceSelectorContent>
                  <VoiceSelectorInput placeholder="Search voices..." />
                  <VoiceSelectorList>
                    <VoiceSelectorEmpty>No voices found.</VoiceSelectorEmpty>
                    <VoiceSelectorGroup>
                      <VoiceSelectorItem value="alloy" onSelect={() => setVoiceId("alloy")}>
                        <span>Alloy (Neutral)</span>
                        <VoiceSelectorShortcut>1</VoiceSelectorShortcut>
                      </VoiceSelectorItem>
                      <VoiceSelectorItem value="echo" onSelect={() => setVoiceId("echo")}>
                        <span>Echo (Male)</span>
                      </VoiceSelectorItem>
                      <VoiceSelectorItem value="nova" onSelect={() => setVoiceId("nova")}>
                        <span>Nova (Female)</span>
                      </VoiceSelectorItem>
                      <VoiceSelectorItem value="shimmer" onSelect={() => setVoiceId("shimmer")}>
                        <span>Shimmer (Warm)</span>
                      </VoiceSelectorItem>
                    </VoiceSelectorGroup>
                  </VoiceSelectorList>
                </VoiceSelectorContent>
              </VoiceSelector>
            </div>
          </div>

          {/* Speech input / record button */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col items-center gap-3 py-6">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-teal to-coral flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
                >
                  <MicIcon size={32} />
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center text-white animate-pulse"
                >
                  <StopCircleIcon size={32} />
                </button>
              )}
              <p className="text-sm font-medium">
                {isRecording ? <span className="text-destructive">Listening…</span> : "Tap to speak"}
              </p>
              {isRecording && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs text-foreground">{transcript}</span>
                </div>
              )}
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-3">
              {isRecording ? "Tap the button to stop" : "Press the mic to start a voice conversation"}
            </p>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2 animate-fade-in">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">You said</h3>
              <Transcription>
                <TranscriptionSegment>{transcript}</TranscriptionSegment>
              </Transcription>
            </div>
          )}

          {/* AI response with audio */}
          {(loading || aiResponse) && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-fade-in">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">agenticOS responded</h3>
              {loading ? (
                <Shimmer duration={1.2}>Speaking…</Shimmer>
              ) : (
                <>
                  <Message from="assistant">
                    <MessageContent>
                      <MessageResponse className="prose-streamdown">
                        {aiResponse}
                      </MessageResponse>
                    </MessageContent>
                  </Message>
                  {aiAudioUrl && (
                    <AudioPlayer className="rounded-xl bg-secondary/50 border border-border">
                      <AudioPlayerElement src={aiAudioUrl} />
                      <div className="flex items-center gap-2 p-2">
                        <AudioPlayerPlayButton className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <PlayIcon size={16} />
                        </AudioPlayerPlayButton>
                        <div className="flex-1 flex items-center gap-2">
                          <AudioPlayerTimeDisplay />
                          <AudioPlayerTimeRange className="flex-1 h-1 rounded-full bg-muted overflow-hidden" />
                          <AudioPlayerDurationDisplay />
                        </div>
                        <AudioPlayerMuteButton className="p-1 rounded hover:bg-secondary" />
                      </div>
                    </AudioPlayer>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
