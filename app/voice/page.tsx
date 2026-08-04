// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Persona } from "@/components/ai-elements/persona";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import {
  AudioPlayer,
  AudioPlayerElement,
  AudioPlayerPlayButton,
  AudioPlayerTimeDisplay,
  AudioPlayerDurationDisplay,
  AudioPlayerTimeRange,
  AudioPlayerMuteButton,
} from "@/components/ai-elements/audio-player";
import { Transcription, TranscriptionSegment } from "@/components/ai-elements/transcription";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MicIcon,
  StopCircleIcon,
  Volume2Icon,
  HeadphonesIcon,
  AudioLinesIcon,
  Mic2Icon,
  Settings2Icon,
} from "lucide-react";

const SAMPLE_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const SAMPLE_VOICES = [
  { id: "alloy", name: "Alloy", desc: "Neutral, balanced" },
  { id: "echo", name: "Echo", desc: "Warm, conversational" },
  { id: "nova", name: "Nova", desc: "Energetic, upbeat" },
  { id: "shimmer", name: "Shimmer", desc: "Soft, gentle" },
];
const SAMPLE_MICS = [
  { id: "default", name: "System default" },
  { id: "external-1", name: "USB Microphone" },
  { id: "bluetooth", name: "AirPods Pro" },
];

export default function VoicePage() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voice, setVoice] = useState("alloy");
  const [mic, setMic] = useState("default");
  const [recognition, setRecognition] = useState<any>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use real Web Speech API on mobile
  const startRecording = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported in this browser. Try Chrome on Android.");
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    r.onerror = (e: any) => console.error("Speech error:", e.error);
    r.onend = () => setRecording(false);
    r.start();
    setRecognition(r);
    setRecording(true);
    setTranscript("");
  }, []);

  const stopRecording = useCallback(() => {
    recognition?.stop();
    setRecording(false);
  }, [recognition]);

  useEffect(() => {
    return () => recognition?.stop();
  }, [recognition]);

  // Audio player
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  }, [playing]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-5 h-12 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal to-coral flex items-center justify-center text-white">
            <Mic2Icon size={14} />
          </div>
          <h1 className="text-sm font-semibold tracking-tight font-space-grotesk">Voice</h1>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings2Icon size={15} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-3 md:p-5 space-y-5 pb-32">
          {/* Persona + recording control */}
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            {/* Animated visualizer */}
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-br from-teal to-coral transition-transform ${
                  recording ? "scale-110 animate-pulse" : "scale-100"
                }`}
              />
              <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                {recording ? (
                  <AudioLinesIcon size={32} className="text-teal animate-pulse" />
                ) : (
                  <MicIcon size={32} className="text-muted-foreground" />
                )}
              </div>
            </div>

            <h2 className="text-lg font-semibold tracking-tight font-space-grotesk">
              {recording ? "Listening…" : "Tap to speak"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {recording
                ? "Tap stop when you're done. We'll transcribe in real time."
                : "Web Speech API · en-US"}
            </p>

            {/* Big record button */}
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`mt-5 mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                recording
                  ? "bg-destructive hover:scale-95"
                  : "bg-gradient-to-br from-teal to-coral hover:scale-105 shadow-primary/30"
              }`}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              {recording ? <StopCircleIcon size={28} /> : <MicIcon size={28} />}
            </button>

            {/* Live transcript */}
            {transcript && (
              <div className="mt-5 rounded-xl bg-muted/50 p-3 text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  Live transcript
                </p>
                <p className="text-sm leading-relaxed">{transcript}</p>
              </div>
            )}
          </div>

          {/* Tabs: Voice + Mic + Sample */}
          <Tabs defaultValue="voice" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="voice" className="text-xs">
                <Volume2Icon size={12} className="mr-1.5" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="mic" className="text-xs">
                <MicIcon size={12} className="mr-1.5" />
                Mic
              </TabsTrigger>
              <TabsTrigger value="sample" className="text-xs">
                <HeadphonesIcon size={12} className="mr-1.5" />
                Sample
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voice" className="space-y-2 mt-3">
              {SAMPLE_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    voice === v.id
                      ? "border-teal bg-teal/5"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        voice === v.id ? "bg-teal text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Volume2Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                    </div>
                    {voice === v.id && (
                      <span className="text-[10px] text-teal font-medium">Active</span>
                    )}
                  </div>
                </button>
              ))}
            </TabsContent>

            <TabsContent value="mic" className="space-y-2 mt-3">
              {SAMPLE_MICS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMic(m.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    mic === m.id
                      ? "border-coral bg-coral/5"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        mic === m.id ? "bg-coral text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MicIcon size={14} />
                    </div>
                    <p className="text-sm font-medium flex-1">{m.name}</p>
                    {mic === m.id && (
                      <span className="text-[10px] text-coral font-medium">Active</span>
                    )}
                  </div>
                </button>
              ))}
            </TabsContent>

            <TabsContent value="sample" className="mt-3">
              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <HeadphonesIcon size={10} />
                  Sample audio
                </p>
                <AudioPlayer className="rounded-xl bg-muted/30 p-3">
                  <AudioPlayerElement
                    src={SAMPLE_AUDIO_URL}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <AudioPlayerPlayButton className="w-9 h-9 rounded-full bg-teal text-white flex items-center justify-center hover:scale-105 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <AudioPlayerTimeRange className="w-full" />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 font-mono">
                        <AudioPlayerTimeDisplay className="text-[10px]" />
                        <AudioPlayerDurationDisplay className="text-[10px]" />
                      </div>
                    </div>
                    <AudioPlayerMuteButton className="text-muted-foreground hover:text-foreground" />
                  </div>
                </AudioPlayer>
              </div>
            </TabsContent>
          </Tabs>

          {/* History */}
          {transcript && !recording && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Last transcription
              </p>
              <Transcription>
                <TranscriptionSegment className="text-sm leading-relaxed">
                  {transcript}
                </TranscriptionSegment>
              </Transcription>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
