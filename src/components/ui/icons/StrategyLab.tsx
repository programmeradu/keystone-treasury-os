import type { IconProps } from "./index";

export function IconStrategyLab({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Flask body (erlenmeyer) */}
      <path d="M7 4h10v3l-3 8h3v2a3 3 0 01-3 3h-4a3 3 0 01-3-3v-2h3l-3-8V4z" />
      {/* Flask liquid line */}
      <line x1="6" y1="12" x2="18" y2="12" strokeOpacity="0.5" />
      {/* Bubbles inside */}
      <circle cx="10" cy="9" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="7" r="1" fill="currentColor" opacity="0.8" />
      <circle cx="14" cy="10" r="0.8" fill="currentColor" opacity="0.6" />
      {/* Beaker accent in corner */}
      <path d="M17 18c1 0 1 1 0 1s-1-1 0-1" strokeOpacity="0.4" />
    </svg>
  );
}
