import type { IconProps } from "./index";

export function IconTxExplorer({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Timeline (vertical) */}
      <line x1="12" y1="2" x2="12" y2="22" />
      
      {/* Transaction blocks along timeline */}
      <rect x="8" y="4" width="8" height="3" fill="currentColor" opacity="0.8" />
      <rect x="8" y="10" width="8" height="3" fill="currentColor" opacity="0.6" />
      <rect x="8" y="16" width="8" height="3" fill="currentColor" opacity="0.7" />
      
      {/* Timestamp markers */}
      <line x1="6" y1="5.5" x2="8" y2="5.5" strokeOpacity="0.5" />
      <line x1="6" y1="11.5" x2="8" y2="11.5" strokeOpacity="0.5" />
      <line x1="6" y1="17.5" x2="8" y2="17.5" strokeOpacity="0.5" />
      
      {/* Forward/backward arrows */}
      <path d="M3 22l2-3l-2-3" strokeOpacity="0.4" />
      <path d="M21 2l-2 3l2 3" strokeOpacity="0.4" />
    </svg>
  );
}
