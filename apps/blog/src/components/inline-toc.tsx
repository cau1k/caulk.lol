"use client";

import type { TOCItemType } from "fumadocs-core/toc";
import { ChevronDown } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { TOCProvider } from "./toc";
import { WheelTOCItems } from "./toc/wheel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

export type InlineTocProps = ComponentProps<typeof Collapsible> & {
  items: TOCItemType[];
};

export function InlineTOC({ items, ...props }: InlineTocProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Lock page scroll when focused inside the TOC wheel
  useEffect(() => {
    if (!isFocused) return;

    const preventDefault = (e: WheelEvent | TouchEvent) => {
      // Only prevent if the event target is inside our content
      if (contentRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventDefault, { passive: false });
    document.addEventListener("touchmove", preventDefault, { passive: false });

    return () => {
      document.removeEventListener("wheel", preventDefault);
      document.removeEventListener("touchmove", preventDefault);
    };
  }, [isFocused]);

  return (
    <TOCProvider toc={items}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        {...props}
        className={cn(
          "not-prose rounded-lg border bg-card text-card-foreground",
          props.className,
        )}
      >
        <CollapsibleTrigger className="group inline-flex w-full items-center justify-between px-4 py-2.5 font-medium">
          {props.children ?? "Table of Contents"}
          <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div
            ref={contentRef}
            className="px-4 pb-4"
            onPointerEnter={() => setIsFocused(true)}
            onPointerLeave={() => setIsFocused(false)}
          >
            <WheelTOCItems />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TOCProvider>
  );
}
