import type { IconProps } from "./index";

export function IconFeeOptimizer({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Dollar sign */}
      <path d="M12 2v20M4 8h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z" />
      {/* Downward trend arrow */}
      <path d="M16 14l-4 4-4-4" strokeOpacity="0.7" />
      {/* Small savings indicator (coin) */}
      <circle cx="18" cy="4" r="2.5" strokeOpacity="0.5" />
      <text x="18" y="5.5" fontSize="2" textAnchor="middle" fill="currentColor" opacity="0.5">$</text>
    </svg>
  );
}
