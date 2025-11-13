import type { IconProps } from "./index";

export function IconWalletCopy({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Primary wallet card */}
      <rect x="3" y="3" width="12" height="8" rx="1.5" />
      {/* Secondary wallet card (offset) */}
      <rect x="9" y="9" width="12" height="8" rx="1.5" strokeOpacity="0.6" />
      {/* Bidirectional arrows */}
      <path d="M7 7L9 9" />
      <path d="M9 9L7 7" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
