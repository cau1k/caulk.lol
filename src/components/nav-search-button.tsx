"use client";

import { Search } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { cn } from "@/lib/cn";

export function NavSearchButton({ className }: { className?: string }) {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      aria-label="Open search"
      onClick={() => setOpenSearch(true)}
      className={cn(
        "inline-flex items-center border bg-fd-secondary/50 p-1 gap-1 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground",
        className,
      )}
    >
      <Search className="size-6.5 p-1.5" />
      <kbd className="size-6.5 inline-flex items-center justify-center border bg-fd-background text-xs">
        /
      </kbd>
    </button>
  );
}
