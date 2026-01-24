"use client";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { type ButtonProps, buttonVariants } from "../ui/button";

type SearchToggleProps = Omit<ComponentProps<"button">, "color"> &
  ButtonProps & {
    hideIfDisabled?: boolean;
  };

export function SearchToggle({
  hideIfDisabled,
  size = "icon-sm",
  color = "ghost",
  ...props
}: SearchToggleProps) {
  const { setOpenSearch, enabled } = useSearchContext();
  if (hideIfDisabled && !enabled) return null;

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          size,
          color,
        }),
        props.className,
      )}
      data-search=""
      aria-label="Open Search"
      onClick={() => {
        setOpenSearch(true);
      }}
    >
      <Search />
    </button>
  );
}

export function LargeSearchToggle({
  hideIfDisabled,
  ...props
}: ComponentProps<"button"> & {
  hideIfDisabled?: boolean;
}) {
  const { enabled, hotKey, setOpenSearch } = useSearchContext();
  if (hideIfDisabled && !enabled) return null;

  return (
    <button
      type="button"
      data-search-full=""
      {...props}
      className={cn(
        "inline-flex items-center gap-2 p-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        props.className,
      )}
      onClick={() => {
        setOpenSearch(true);
      }}
    >
      <Search className="size-4" />
      <kbd className="border bg-background px-1.5">
        {hotKey[0]?.display ?? "/"}
      </kbd>
    </button>
  );
}
