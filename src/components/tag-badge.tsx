import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

type TagBadgeProps = {
  tag: string;
  linked?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function TagBadge({
  tag,
  linked = true,
  size = "md",
  className,
}: TagBadgeProps) {
  const baseStyles = cn(
    "border border-fd-border bg-fd-muted font-sans transition-colors",
    size === "sm" && "px-2 py-0.5 text-xs text-fd-muted-foreground",
    size === "md" && "px-3 py-1 text-xs",
    linked && "hover:bg-fd-accent",
    className,
  );

  if (!linked) {
    return <span className={baseStyles}>{tag}</span>;
  }

  return (
    <Link to="/posts/tags/$tag" params={{ tag }} className={baseStyles}>
      {tag}
    </Link>
  );
}
