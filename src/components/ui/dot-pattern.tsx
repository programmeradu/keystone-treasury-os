import * as React from "react";

import { cn } from "@/lib/utils";

type DotPatternProps = {
  className?: string;
  size?: number;
  radius?: number;
  color?: string;
};

export function DotPattern({
  className,
  size = 24,
  radius = 1,
  color = "rgba(255, 255, 255, 0.08)",
}: DotPatternProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: `radial-gradient(${color} ${radius}px, transparent ${radius}px)` ,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
