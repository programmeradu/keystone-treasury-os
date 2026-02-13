import * as React from "react";

import { cn } from "@/lib/utils";

type BentoGridProps = {
  className?: string;
  children: React.ReactNode;
};

type BentoGridItemProps = {
  className?: string;
  title?: string;
  description?: string;
  header?: React.ReactNode;
  icon?: React.ReactNode;
};

export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[minmax(180px,_1fr)] grid-cols-1 gap-4 md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: BentoGridItemProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-landing transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-landing-hover",
        className,
      )}
    >
      {header ? <div className="mb-4">{header}</div> : null}
      {icon ? <div className="mb-3 text-white/70">{icon}</div> : null}
      {title ? (
        <h3 className="text-base font-semibold text-white">{title}</h3>
      ) : null}
      {description ? (
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}
