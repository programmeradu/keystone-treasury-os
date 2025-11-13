import type { IconProps } from "./index";

export function IconAirDropScout({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Outer compass ring */}
      <circle cx="12" cy="12" r="10" />
      {/* Cardinal directions (N, S, E, W) */}
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      {/* Inner target */}
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      {/* Crosshairs */}
      <path d="M8 12h8M12 8v8" strokeOpacity="0.5" strokeDasharray="2,2" />
    </svg>
  );
}
