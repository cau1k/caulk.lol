import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const logoVariants = cva("inline-flex shrink-0 items-center", {
  variants: {
    variant: {
      icon: "",
      text: "gap-[0.625em] font-semibold",
      subheader: "gap-[0.625em] font-normal",
    },
  },
  defaultVariants: { variant: "text" },
});

type LogoProps = VariantProps<typeof logoVariants> & {
  /** Width and height of the mark in pixels. */
  size?: number;
  subtitle?: string;
  className?: string;
};

/** Size sets the mark's height; em dimensions scale its text and spacing together. */
export function Logo({ size = 48, variant = "text", subtitle, className }: LogoProps) {
  return (
    <span
      className={cn(logoVariants({ variant }), className)}
      style={{ fontSize: size / 3 }}
      role={variant === "icon" ? "img" : undefined}
      aria-label={variant === "icon" ? "caulk.lol" : undefined}
    >
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
      {variant !== "icon" && (
        <span
          className={cn(
            "flex h-[3em] flex-col justify-center gap-[0.125em]",
            variant === "subheader" &&
              "w-[16em] max-w-[calc(100vw-8rem)] [container-type:inline-size]",
          )}
        >
          <span className="font-semibold leading-none">caulk.lol</span>
          {variant === "subheader" &&
            subtitle && (
              // Container units keep the tagline within the mark's height on narrow screens.
              <span className="text-[min(0.75em,5cqi)] leading-[1.15] text-muted-foreground">
                {subtitle}
              </span>
            )}
        </span>
      )}
    </span>
  );
}
