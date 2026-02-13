import * as React from "react";

import { cn } from "@/lib/utils";

type GridPatternProps = {
  className?: string;
  size?: number;
  stroke?: string;
  thickness?: number;
};

export function GridPattern({
  className,
  size = 32,
  stroke = "rgba(255, 255, 255, 0.06)",
  thickness = 1,
}: GridPatternProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage: `linear-gradient(${stroke} ${thickness}px, transparent ${thickness}px), linear-gradient(90deg, ${stroke} ${thickness}px, transparent ${thickness}px)` ,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
