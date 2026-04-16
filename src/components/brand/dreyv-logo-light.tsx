import Image from "next/image";
import { cn } from "@/lib/utils";

type DreyvLogoLightVariant = "default" | "auth" | "footer";

type DreyvLogoLightProps = {
  className?: string;
  priority?: boolean;
  /** Auth: centered `/auth` hero. Footer: full column width (capped). */
  variant?: DreyvLogoLightVariant;
};

const imageClassDefault =
  "object-contain object-left origin-left scale-[1.68] sm:scale-[1.82] md:scale-[1.96]";

const imageClassAuth =
  "object-contain object-center origin-center scale-[1.82] sm:scale-[1.96] md:scale-[2.08]";

/**
 * Full horizontal lockup on transparent canvas — for **light** backgrounds (`public/brand/dreyv-logo-light.png`).
 * Same square-canvas padding pattern as {@link DreyvLogoDark}.
 */
export function DreyvLogoLight({
  className,
  priority,
  variant = "default",
}: DreyvLogoLightProps) {
  const isAuth = variant === "auth";
  const isFooter = variant === "footer";

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
          "h-12 w-[min(92vw,300px)] sm:h-[52px] sm:w-[min(56vw,368px)] md:h-[60px] md:w-[392px]",
        className,
      )}
    >
      <Image
        src="/brand/dreyv-logo-light.png"
        alt=""
        fill
        className={isAuth ? imageClassAuth : imageClassDefault}
        sizes={
          isFooter
            ? "(max-width:640px) 90vw, (max-width:768px) 40vw, 372px"
            : isAuth
              ? "(max-width:640px) 94vw, 400px"
              : "(max-width:640px) 300px, (max-width:768px) 368px, 392px"
        }
        priority={priority}
      />
    </span>
  );
}
