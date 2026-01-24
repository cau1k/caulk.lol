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
        "inline-flex items-center p-2 text-muted-foreground transition-colors hover:text-accent-foreground",
        className,
      )}
    >
      <Search className="size-4" />
    </button>
  );
}
