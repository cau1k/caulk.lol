"use client";

import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export function NavSearchButton({ className }: { className?: string }) {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      aria-label="Open search"
      onClick={() => setOpenSearch(true)}
      className={cn(
        "inline-flex items-center border bg-secondary/50 p-1 gap-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Search className="size-6.5 p-1.5" />
      <kbd className="size-6.5 inline-flex items-center justify-center border bg-background font-mono text-xs leading-none">
        <span>/</span>
      </kbd>
    </button>
  );
}
