import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

type TagBadgeBaseProps = {
  tag: string;
  linked?: boolean;
  showCount?: boolean;
  className?: string;
};

type TagBadgeFixedSize = TagBadgeBaseProps & {
  size?: "sm" | "md" | "inline";
  count?: never;
  maxCount?: never;
};

type TagBadgeScaledSize = TagBadgeBaseProps & {
  size: "scaled";
  count: number;
  maxCount: number;
};

type TagBadgeProps = TagBadgeFixedSize | TagBadgeScaledSize;

function getScaledStyles(count: number, maxCount: number) {
  const ratio = Math.max(0.4, count / maxCount);
  const fontSize = 0.75 + ratio * 0.75; // 0.75rem to 1.5rem
  const paddingX = 0.5 + ratio * 0.5; // 0.5rem to 1rem
  const paddingY = 0.25 + ratio * 0.25; // 0.25rem to 0.5rem

  return {
    fontSize: `${fontSize}rem`,
    padding: `${paddingY}rem ${paddingX}rem`,
  };
}

export function TagBadge({
  tag,
  linked = true,
  showCount = false,
  size = "md",
  className,
  ...rest
}: TagBadgeProps) {
  const isInline = size === "inline";
  const isScaled = size === "scaled";
  const scaledProps = rest as { count?: number; maxCount?: number };

  if (isInline) {
    const inlineContent = `${tag}`;
    const inlineStyles = cn(
      "font-mono text-xs text-fd-muted-foreground transition-colors",
      linked && "hover:text-fd-foreground",
      className,
    );

    if (!linked) {
      return <span className={inlineStyles}>{inlineContent}</span>;
    }

    return (
      <Link to="/posts/tags/$tag" params={{ tag }} className={inlineStyles}>
        {inlineContent}
      </Link>
    );
  }

  const baseStyles = cn(
    "border border-fd-border bg-fd-muted font-sans transition-colors",
    !isScaled &&
      size === "sm" &&
      "px-2 py-0.5 text-xs text-fd-muted-foreground",
    !isScaled && size === "md" && "px-3 py-1 text-xs",
    linked && "hover:bg-fd-accent",
    className,
  );

  const inlineStyle = isScaled
    ? getScaledStyles(scaledProps.count!, scaledProps.maxCount!)
    : undefined;

  const content = (
    <>
      {tag}
      {showCount && isScaled && scaledProps.count !== undefined && (
        <span className="ml-1.5 opacity-60">({scaledProps.count})</span>
      )}
    </>
  );

  if (!linked) {
    return (
      <span className={baseStyles} style={inlineStyle}>
        {content}
      </span>
    );
  }

  return (
    <Link
      to="/posts/tags/$tag"
      params={{ tag }}
      className={baseStyles}
      style={inlineStyle}
    >
      {content}
    </Link>
  );
}
