import { cn } from "@/lib/cn";

type LogoProps = {
  /** Width and height of the mark in pixels. */
  size?: number;
  className?: string;
};

/** Aristotle's silhouette inherits the surrounding text color in either theme. */
export function Logo({ size = 20, className }: LogoProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-current leading-none", className)}
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
  );
}
