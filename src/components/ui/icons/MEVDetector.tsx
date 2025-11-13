import type { IconProps } from "./index";

export function IconMEVDetector({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Grid network background */}
      <line x1="4" y1="8" x2="20" y2="8" strokeOpacity="0.3" />
      <line x1="4" y1="12" x2="20" y2="12" strokeOpacity="0.3" />
      <line x1="4" y1="16" x2="20" y2="16" strokeOpacity="0.3" />
      <line x1="8" y1="4" x2="8" y2="20" strokeOpacity="0.3" />
      <line x1="12" y1="4" x2="12" y2="20" strokeOpacity="0.3" />
      <line x1="16" y1="4" x2="16" y2="20" strokeOpacity="0.3" />
      
      {/* Spotlight cone */}
      <path d="M2 2l6 12l-6 2z" strokeOpacity="0.7" fill="currentColor" opacity="0.15" />
      
      {/* Highlighted block/anomaly */}
      <rect x="10" y="6" width="4" height="4" fill="currentColor" opacity="0.8" />
      
      {/* Alert indicator */}
      <circle cx="18" cy="3" r="1.5" fill="currentColor" />
      <path d="M18 5v1" strokeOpacity="0.6" />
    </svg>
  );
}
