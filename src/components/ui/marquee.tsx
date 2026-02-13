import * as React from "react";

import { cn } from "@/lib/utils";

type MarqueeProps = {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
};

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = true,
  children,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group flex w-full overflow-hidden [--gap:1.5rem] [--duration:35s]",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-w-full shrink-0 items-center gap-[var(--gap)] animate-marquee",
          reverse && "animate-marquee-reverse",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "flex min-w-full shrink-0 items-center gap-[var(--gap)] animate-marquee",
          reverse && "animate-marquee-reverse",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
