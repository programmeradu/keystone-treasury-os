import type { IconProps } from "./index";

export function IconMarketPulse({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Trending line chart */}
      <path d="M3 18l5-5 4 4 8-8" />
      {/* Mountain peak overlay */}
      <path d="M3 18l6-10 6 8 5-5" strokeOpacity="0.4" strokeDasharray="2,2" />
      {/* Pulse indicators along the line */}
      <circle cx="8" cy="13" r="1" fill="currentColor" opacity="0.8" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" opacity="0.6" />
      <circle cx="16" cy="9" r="0.7" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
