import type { IconProps } from "./index";

export function IconHolderAnalytics({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Central hub node (larger) */}
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.9" />
      
      {/* Peripheral nodes (varying sizes) */}
      <circle cx="3" cy="6" r="2" />
      <circle cx="21" cy="7" r="2.5" strokeOpacity="0.7" />
      <circle cx="6" cy="20" r="1.8" />
      <circle cx="18" cy="19" r="2.2" strokeOpacity="0.6" />
      <circle cx="12" cy="3" r="1.5" />
      <circle cx="12" cy="21" r="1.2" strokeOpacity="0.5" />
      
      {/* Connection lines */}
      <line x1="12" y1="12" x2="3" y2="6" strokeOpacity="0.5" />
      <line x1="12" y1="12" x2="21" y2="7" strokeOpacity="0.5" />
      <line x1="12" y1="12" x2="6" y2="20" strokeOpacity="0.5" />
      <line x1="12" y1="12" x2="18" y2="19" strokeOpacity="0.5" />
      <line x1="12" y1="12" x2="12" y2="3" strokeOpacity="0.5" />
      <line x1="12" y1="12" x2="12" y2="21" strokeOpacity="0.5" />
    </svg>
  );
}
