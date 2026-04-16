import Image from "next/image";
import { cn } from "@/lib/utils";

type DreyvMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Transparent PNG mark from `public/brand/dreyv-mark.png` */
export function DreyvMark({ size = 28, className, priority }: DreyvMarkProps) {
  return (
    <Image
      src="/brand/dreyv-mark.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      priority={priority}
    />
  );
}
