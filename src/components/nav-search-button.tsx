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
        "inline-flex items-center gap-2 border bg-fd-secondary/50 px-2 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground",
        className,
      )}
    >
      <Search className="size-4" />
      <kbd className="border bg-fd-background px-1.5 text-xs">/</kbd>
    </button>
  );
}
