import * as React from "react";

import { cn } from "@/lib/utils";

type AnimatedListProps = {
  className?: string;
  children: React.ReactNode;
  stagger?: number;
};

export function AnimatedList({ className, children, stagger = 0.08 }: AnimatedListProps) {
  const items = React.Children.toArray(children);
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((child, index) => (
        <div
          key={index}
          className="animate-list-item"
          style={{ animationDelay: `${index * stagger}s` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
