import Image from "next/image";
import { cn } from "@/lib/utils";

type DreyvLogoDarkVariant = "header" | "footer" | "auth";

type DreyvLogoDarkProps = {
  className?: string;
  priority?: boolean;
  /** Footer: full width of column (capped). Auth: centered mobile hero on `/auth`. */
  variant?: DreyvLogoDarkVariant;
};

/** Header / footer: align to start (nav + grid). */
const imageClassDefault =
  "object-contain object-left origin-left scale-[1.68] sm:scale-[1.82] md:scale-[1.96]";

/** Auth mobile: center in slot; stronger scale so the lockup reads larger. */
const imageClassAuth =
  "object-contain object-center origin-center scale-[1.82] sm:scale-[1.96] md:scale-[2.08]";

/**
 * Full horizontal lockup, transparent — for dark backgrounds (`public/brand/dreyv-logo-dark.png`).
 * The file is a square canvas with generous empty transparency; we use a taller slot + scale from the
 * left so the real lockup is readable.
 */
export function DreyvLogoDark({
  className,
  priority,
  variant = "header",
}: DreyvLogoDarkProps) {
  const isFooter = variant === "footer";
  const isAuth = variant === "auth";

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 align-middle",
        isFooter &&
          "h-12 w-full max-w-[372px] sm:h-[52px] md:h-[60px]",
        isAuth &&
          "mx-auto h-14 w-[min(94vw,372px)] max-w-full sm:h-[58px] sm:w-[min(92vw,400px)]",
        !isFooter &&
          !isAuth &&
          "h-12 w-[min(86vw,276px)] sm:h-[52px] sm:w-[min(72vw,324px)] md:h-[60px] md:w-[372px]",
        className,
      )}
    >
      <Image
        src="/brand/dreyv-logo-dark.png"
        alt=""
        fill
        className={isAuth ? imageClassAuth : imageClassDefault}
        sizes={
          isFooter
            ? "(max-width:640px) 90vw, (max-width:768px) 40vw, 372px"
            : isAuth
              ? "(max-width:640px) 94vw, 400px"
              : "(max-width:640px) 276px, (max-width:768px) 324px, 372px"
        }
        priority={priority}
      />
    </span>
  );
}
