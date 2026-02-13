"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ShimmerButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  shimmerColor?: string;
};

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, shimmerColor = "rgba(54, 226, 123, 0.45)", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(54,226,123,0.25)] transition-all duration-300 hover:border-white/30 hover:bg-white/10",
          className,
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{props.children}</span>
        <span className="pointer-events-none absolute inset-0">
          <span
            className="absolute -inset-[200%] animate-shimmer"
            style={{
              background: `linear-gradient(120deg, transparent 30%, ${shimmerColor} 50%, transparent 70%)`,
            }}
          />
        </span>
      </Comp>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";
