import type { IconProps } from "./index";

export function IconTokenSwap({ className = "h-4 w-4", "aria-label": label }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-label={label}
      aria-hidden={!label}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Left arrow with token (circle) */}
      <circle cx="4" cy="8" r="2" />
      <path d="M6 8h4" />
      {/* Right arrow with token (circle) */}
      <circle cx="20" cy="16" r="2" />
      <path d="M18 16h-4" />
      {/* Crossover exchange zone */}
      <path d="M10 8l4 8M14 8l-4 8" strokeOpacity="0.6" />
      {/* Exchange indicator */}
      <text x="12" y="14" fontSize="3.5" textAnchor="middle" fill="currentColor" opacity="0.7">⟷</text>
    </svg>
  );
}
