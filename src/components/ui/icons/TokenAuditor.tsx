import type { IconProps } from "./index";

export function IconTokenAuditor({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Shield outline */}
      <path d="M3 4l9-2 9 2v7c0 6-9 8-9 8s-9-2-9-8V4z" />
      
      {/* Checkmark inside shield */}
      <path d="M7 12l3 3 5-7" />
      
      {/* Lock accent */}
      <circle cx="12" cy="18" r="2.5" fill="none" strokeOpacity="0.5" />
      <path d="M10.5 16v-1a1.5 1.5 0 013 0v1" strokeOpacity="0.5" />
      
      {/* Warning indicators in corners */}
      <circle cx="2" cy="4" r="0.8" fill="currentColor" opacity="0.4" />
      <circle cx="22" cy="4" r="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
