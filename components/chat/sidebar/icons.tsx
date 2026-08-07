// Sidebar icons — all inline SVG icons centralized
// Gemini-style: thin strokes (1.4-1.7), rounded line caps, no fill
// Use currentColor so they adapt to theme

import * as React from "react";

type IconProps = { size?: number; className?: string };

const make = (path: React.ReactNode, viewBox = "0 0 16 16") =>
  // eslint-disable-next-line react/display-name
  React.memo(({ size = 16, className = "" }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  ));

export const PlusIcon = make(
  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
);

export const SearchIcon = make(
  <>
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </>
);

export const MessageIcon = make(
  <path
    d="M2.5 4.5C2.5 3.95 2.95 3.5 3.5 3.5H12.5C13.05 3.5 13.5 3.95 13.5 4.5V9.5C13.5 10.05 13.05 10.5 12.5 10.5H6.5L3.5 13V10.5H3.5C2.95 10.5 2.5 10.05 2.5 9.5V4.5Z"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinejoin="round"
  />
);

export const MessageCircleDashedIcon = make(
  <>
    <path
      d="M2 12C2 6.477 6.477 2 12 2M22 12C22 17.523 17.523 22 12 22M4.93 4.93C3.547 6.314 2.665 8.066 2.273 9.95M19.07 4.93C20.453 6.314 21.335 8.066 21.727 9.95M2.273 14.05C2.665 15.934 3.547 17.686 4.93 19.07M21.727 14.05C21.335 15.934 20.453 17.686 19.07 19.07M9 11.5h.01M15 11.5h.01M9 14.5c.5 1 1.5 1.5 3 1.5s2.5-.5 3-1.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>,
  "0 0 24 24"
);

export const SparkleIcon = make(
  <path
    d="M9 1L10.5 6.5L16 8L10.5 9.5L9 15L7.5 9.5L2 8L7.5 6.5L9 1Z"
    fill="currentColor"
  />,
  "0 0 18 18"
);

export const PencilIcon = make(
  <path
    d="M11.5 2L14 4.5L5 13.5H2.5V11L11.5 2Z"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinejoin="round"
  />
);

export const TrashIcon = make(
  <path
    d="M3 4.5H13M6.5 4.5V3.5C6.5 2.95 6.95 2.5 7.5 2.5H8.5C9.05 2.5 9.5 2.95 9.5 3.5V4.5M5 4.5L5.5 13C5.5 13.55 5.95 14 6.5 14H9.5C10.05 14 10.5 13.55 10.5 13L11 4.5"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export const ShareIcon = make(
  <>
    <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5.8 7L10.2 4M5.8 9L10.2 12" stroke="currentColor" strokeWidth="1.3" />
  </>
);

export const MoreIcon = make(
  <>
    <circle cx="3" cy="8" r="1.2" fill="currentColor" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="13" cy="8" r="1.2" fill="currentColor" />
  </>
);

export const CloseIcon = make(
  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
);

export const SettingsIcon = make(
  <>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M13.5 8C13.5 7.6 13.4 7.2 13.3 6.9L14.5 6L13 3.5L11.7 4C11.2 3.6 10.7 3.3 10.1 3.1L9.8 1.5H6.2L5.9 3.1C5.3 3.3 4.8 3.6 4.3 4L3 3.5L1.5 6L2.7 6.9C2.6 7.2 2.5 7.6 2.5 8C2.5 8.4 2.6 8.8 2.7 9.1L1.5 10L3 12.5L4.3 12C4.8 12.4 5.3 12.7 5.9 12.9L6.2 14.5H9.8L10.1 12.9C10.7 12.7 11.2 12.4 11.7 12L13 12.5L14.5 10L13.3 9.1C13.4 8.8 13.5 8.4 13.5 8Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </>
);

export const LogoutIcon = make(
  <path
    d="M9 2H4C3.45 2 3 2.45 3 3V13C3 13.55 3.45 14 4 14H9M11 11L14 8L11 5M14 8H6"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export const CheckIcon = make(
  <path
    d="M3 8L6.5 11.5L13 5"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export const SunIcon = make(
  <>
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.95 3.05L11.9 4.1M4.1 11.9L3.05 12.95M12.95 12.95L11.9 11.9M4.1 4.1L3.05 3.05"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </>
);

export const MoonIcon = make(
  <path
    d="M14 9.5C13.4 10.4 12.5 11 11.5 11.3C10.5 11.6 9.4 11.6 8.4 11.2C7.4 10.8 6.6 10.1 6.1 9.1C5.6 8.1 5.4 7 5.6 5.9C5.8 4.8 6.4 3.9 7.2 3.2C8 2.5 9 2.1 10 2.1C9 3 8.4 4.2 8.4 5.5C8.4 6.8 8.9 8 9.8 8.9C10.7 9.8 11.9 10.3 13.2 10.3C13.5 10.3 13.8 10.3 14 10.2C14 10 14 9.7 14 9.5Z"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export const SystemIcon = make(
  <>
    <rect x="2" y="3" width="12" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 13H11M8 11V13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </>
);

export const ChevronRightIcon = make(
  <path
    d="M6 4L10 8L6 12"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export const PinIcon = make(
  <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" fill="currentColor" />,
  "0 0 16 16"
);
