import type { IconProps } from "./index";

export function IconDCAScheduler({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Gear/cog base */}
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v3M12 19v3M22 12h-3M3 12H0M19 5l-2 2M7 17l2 2M5 19l2-2M17 7l2-2" />
      
      {/* Calendar grid overlay */}
      <rect x="4" y="8" width="8" height="8" rx="1" fill="none" strokeOpacity="0.4" />
      <line x1="4" y1="11" x2="12" y2="11" strokeOpacity="0.4" />
      <line x1="8" y1="8" x2="8" y2="16" strokeOpacity="0.4" />
      
      {/* Time indicator (clock hands style) */}
      <line x1="12" y1="12" x2="12" y2="10" />
      <line x1="12" y1="12" x2="13.5" y2="12" />
      
      {/* Recurring pattern arrows */}
      <path d="M18 10l1 1l-1 1" strokeOpacity="0.5" />
      <path d="M18 16l1 1l-1 1" strokeOpacity="0.5" />
    </svg>
  );
}
