"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type NumberTickerProps = {
  value: number;
  startValue?: number;
  duration?: number;
  decimalPlaces?: number;
  className?: string;
};

export function NumberTicker({
  value,
  startValue = 0,
  duration = 1.4,
  decimalPlaces = 0,
  className,
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = React.useState(startValue);

  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }),
    [decimalPlaces],
  );

  React.useEffect(() => {
    let frame: number;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / (duration * 1000), 1);
      const nextValue = startValue + (value - startValue) * progress;
      setDisplayValue(nextValue);
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      }
    };

    frame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [value, startValue, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {formatter.format(displayValue)}
    </span>
  );
}
