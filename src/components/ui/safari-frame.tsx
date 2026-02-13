import * as React from "react";

import { cn } from "@/lib/utils";

type SafariFrameProps = {
  className?: string;
  title?: string;
  children: React.ReactNode;
};

export function SafariFrame({ className, title = "keystone.app", children }: SafariFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-landing",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <div className="flex-1 text-center text-xs font-mono text-white/50">
          {title}
        </div>
      </div>
      <div className="bg-black/20">{children}</div>
    </div>
  );
}
