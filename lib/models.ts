// MiniMax models — single source of truth for the model selector
// All 8 currently available models per https://platform.MiniMax.io/docs/api-reference/api-overview
// Prices and speeds from https://vercel.com/ai-gateway/models/minimax-m3

export interface ModelInfo {
  id: string;            // The API model id (passed to the provider)
  name: string;          // Human-readable name shown in UI
  description: string;   // Short description shown in selector
  contextWindow: number; // Context size in tokens
  speed: number;         // Output speed in tokens/second
  badge?: string;        // Optional badge (e.g. "Latest", "Fastest")
  group: string;         // Group label for the selector
  isDefault?: boolean;   // True for the default model
}

export const MODELS: ModelInfo[] = [
  {
    id: "MiniMax-M3",
    name: "MiniMax M3",
    description: "Latest agentic · 1M context",
    contextWindow: 1_000_000,
    speed: 30,
    badge: "Latest",
    group: "Latest",
    isDefault: true,
  },
  {
    id: "MiniMax-M2.7",
    name: "MiniMax M2.7",
    description: "Balanced · 60 tps",
    contextWindow: 204_800,
    speed: 60,
    group: "M2.7 series",
  },
  {
    id: "MiniMax-M2.7-highspeed",
    name: "MiniMax M2.7 Highspeed",
    description: "Faster · 100 tps",
    contextWindow: 204_800,
    speed: 100,
    badge: "Fastest M2.7",
    group: "M2.7 series",
  },
  {
    id: "MiniMax-M2.5",
    name: "MiniMax M2.5",
    description: "Peak performance · 60 tps",
    contextWindow: 204_800,
    speed: 60,
    group: "M2.5 series",
  },
  {
    id: "MiniMax-M2.5-highspeed",
    name: "MiniMax M2.5 Highspeed",
    description: "Faster · 100 tps",
    contextWindow: 204_800,
    speed: 100,
    group: "M2.5 series",
  },
  {
    id: "MiniMax-M2.1",
    name: "MiniMax M2.1",
    description: "Multi-language coding · 60 tps",
    contextWindow: 204_800,
    speed: 60,
    group: "M2.1 series",
  },
  {
    id: "MiniMax-M2.1-highspeed",
    name: "MiniMax M2.1 Highspeed",
    description: "Faster · 100 tps",
    contextWindow: 204_800,
    speed: 100,
    group: "M2.1 series",
  },
  {
    id: "MiniMax-M2",
    name: "MiniMax M2",
    description: "Agentic · 60 tps",
    contextWindow: 204_800,
    speed: 60,
    group: "M2",
  },
];

export const DEFAULT_MODEL_ID = "MiniMax-M3";

// Lookup helper
export function getModel(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

// Get models grouped by their `group` field (preserves insertion order)
export function getGroupedModels(): Array<{ group: string; models: ModelInfo[] }> {
  const map = new Map<string, ModelInfo[]>();
  for (const m of MODELS) {
    if (!map.has(m.group)) map.set(m.group, []);
    map.get(m.group)!.push(m);
  }
  return Array.from(map.entries()).map(([group, models]) => ({ group, models }));
}

// localStorage key for persisting user's model choice
export const MODEL_STORAGE_KEY = "agenticos-model";

// Persisted model helpers (safe for SSR — try/catch wraps localStorage)
export function getStoredModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL_ID;
  try {
    const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored && MODELS.some((m) => m.id === stored)) return stored;
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return DEFAULT_MODEL_ID;
}

export function setStoredModel(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODEL_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
