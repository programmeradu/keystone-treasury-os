import type { IconProps } from "./index";

export function IconPortfolioBalancer({ className = "h-4 w-4", "aria-label": label }: IconProps) {
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
      {/* Fulcrum (center) */}
      <path d="M12 8v12l-3 2h6l-3-2z" fill="currentColor" opacity="0.3" />
      
      {/* Left pan */}
      <rect x="2" y="8" width="8" height="3" rx="0.5" />
      {/* Left arm */}
      <line x1="6" y1="8" x2="12" y2="8" />
      
      {/* Right pan */}
      <rect x="14" y="8" width="8" height="3" rx="0.5" />
      {/* Right arm */}
      <line x1="18" y1="8" x2="12" y2="8" />
      
      {/* Weights on left */}
      <circle cx="4" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="6" cy="13" r="1.2" fill="currentColor" opacity="0.6" />
      
      {/* Weights on right */}
      <circle cx="18" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="20" cy="13" r="1.2" fill="currentColor" opacity="0.6" />
      
      {/* Equilibrium indicator */}
      <line x1="11" y1="7" x2="13" y2="7" strokeOpacity="0.4" />
    </svg>
  );
}
