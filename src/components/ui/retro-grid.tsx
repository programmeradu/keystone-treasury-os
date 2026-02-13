import * as React from "react";

import { cn } from "@/lib/utils";

type RetroGridProps = {
  className?: string;
};

export function RetroGrid({ className }: RetroGridProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="retro-grid" />
    </div>
  );
}
