import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
      "font-mono text-xs text-muted-foreground transition-colors",
      linked && "hover:text-foreground",
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
    "border border-border bg-muted font-sans transition-colors",
    !isScaled && size === "sm" && "px-2 py-0.5 text-xs text-muted-foreground",
    !isScaled && size === "md" && "px-3 py-1 text-xs",
    linked && "hover:bg-accent",
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

type TagBadgeListProps = {
  tags: string[];
  mobileLimit?: number;
  className?: string;
  size?: "sm" | "md" | "inline";
};

export function TagBadgeList({
  tags,
  mobileLimit = 2,
  className,
  size,
}: TagBadgeListProps) {
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, mobileLimit);
  const overflowTags = tags.slice(mobileLimit);
  const hasOverflow = overflowTags.length > 0;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* mobile: show limited tags */}
      <div className="flex flex-wrap gap-2 sm:hidden">
        {visibleTags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
        {hasOverflow && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex aspect-square items-center justify-center border border-border bg-muted px-2 py-1 text-xs transition-colors hover:bg-accent"
              >
                +
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <TagBadge key={tag} tag={tag} size={size} />
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* desktop: show all tags */}
      <div className="hidden sm:flex sm:flex-wrap sm:gap-2">
        {tags.map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>
    </div>
  );
}
