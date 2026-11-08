import icon from "@/assets/elcine-icon.svg";
import { cn } from "@/lib/utils";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "./wordmark";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img src={icon} alt="" className="size-10 shrink-0" />
      <svg
        viewBox={WORDMARK_VIEWBOX}
        className="h-7 w-auto fill-current"
        role="img"
        aria-label="elcine"
      >
        <path d={WORDMARK_PATH} />
      </svg>
    </span>
  );
}
