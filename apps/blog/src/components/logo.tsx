import { cn } from "@/lib/cn";

type LogoProps = {
  /** Width and height of the mark in pixels. */
  size?: number;
  subtitle?: string;
  className?: string;
};

/** The wordmark and optional subtitle share a theme-aware Aristotle silhouette. */
export function Logo({ size = 20, subtitle, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="inline-block shrink-0 bg-current leading-none"
        style={{
          width: size,
          height: size,
          WebkitMaskImage: 'url("/media/aristotle.svg")',
          WebkitMaskSize: "contain",
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskImage: 'url("/media/aristotle.svg")',
          maskSize: "contain",
          maskPosition: "center",
          maskRepeat: "no-repeat",
        }}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold leading-tight">caulk.lol</span>
        {subtitle && (
          <span className="max-w-[min(16rem,calc(100vw-8rem))] text-xs font-normal leading-tight text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
