// MiniMax AI setup for agenticOS
// Using Vercel AI SDK with the MiniMax community provider

import { createMinimax } from "vercel-minimax-ai-provider";

export const minimax = createMinimax({
  apiKey: process.env.MINIMAX_API_KEY,
});

// Default model
export const DEFAULT_MODEL = "MiniMax-M2";
