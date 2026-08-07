// MiniMaxMark — a custom "M" mark in a teal rounded square.
// Used in the model selector dropdown since MiniMax isn't on models.dev.

import * as React from "react";

export interface MiniMaxMarkProps {
  size?: number;
  className?: string;
}

export function MiniMaxMark({ size = 20, className }: MiniMaxMarkProps) {
  return (
    <span
      aria-label="MiniMax"
      role="img"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.max(4, size * 0.25),
        background: "linear-gradient(135deg, #14B8A6 0%, #0E7C7B 100%)",
        color: "white",
        fontWeight: 700,
        fontSize: size * 0.55,
        fontFamily:
          "var(--font-space-grotesk), 'Space Grotesk', system-ui, sans-serif",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      M
    </span>
  );
}

export default MiniMaxMark;
