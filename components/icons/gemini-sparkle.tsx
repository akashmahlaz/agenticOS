// GeminiSparkle — the four-color Gemini sparkle/diamond star logo.
// Colors match Google's new Gemini icon: blue (right), red (top),
// yellow (left), green (bottom), with soft transitions.
//
// Source path: from Google's official Gemini logo SVG.
// Uses radial conic-like gradients in linearGradient stops.

import * as React from "react";

export interface GeminiSparkleProps {
  size?: number;
  className?: string;
  // Unique id prefix for gradient defs (allows multiple sparkles on one page)
  idPrefix?: string;
}

export function GeminiSparkle({ size = 48, className, idPrefix = "gsp" }: GeminiSparkleProps) {
  // Four linear gradients — one per point (top, right, bottom, left)
  // Each starts white in the center and fades to the point color.
  const topId = `${idPrefix}-top`;
  const rightId = `${idPrefix}-right`;
  const bottomId = `${idPrefix}-bottom`;
  const leftId = `${idPrefix}-left`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      className={className}
      aria-label="Gemini sparkle"
    >
      <defs>
        {/* Top point → red */}
        <linearGradient id={topId} x1="500" y1="0" x2="500" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA4335" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        {/* Right point → blue */}
        <linearGradient id={rightId} x1="1000" y1="500" x2="0" y2="500" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        {/* Bottom point → green */}
        <linearGradient id={bottomId} x1="500" y1="1000" x2="500" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34A853" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        {/* Left point → yellow */}
        <linearGradient id={leftId} x1="0" y1="500" x2="1000" y2="500" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBC04" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* Four pointed star (4 triangular wedges meeting at center) */}
      {/* Path: M500,0 L600,400 L1000,500 L600,600 L500,1000 L400,600 L0,500 L400,400 Z */}
      <path
        d="M500,0 L612,388 L1000,500 L612,612 L500,1000 L388,612 L0,500 L388,388 Z"
        fill={`url(#${topId})`}
      />
      {/* Right half blue overlay — fills the right side with blue gradient */}
      <path
        d="M500,0 L612,388 L1000,500 L612,612 L500,1000 Z"
        fill={`url(#${rightId})`}
        style={{ mixBlendMode: "multiply" }}
      />
      {/* Bottom half green */}
      <path
        d="M500,1000 L388,612 L0,500 L388,388 L500,0 Z"
        fill={`url(#${bottomId})`}
        style={{ mixBlendMode: "multiply" }}
      />
      {/* Left half yellow */}
      <path
        d="M500,0 L388,388 L0,500 L388,612 L500,1000 Z"
        fill={`url(#${leftId})`}
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

export default GeminiSparkle;
