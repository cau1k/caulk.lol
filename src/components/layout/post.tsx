"use client";

import {
  createContext,
  use,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { TOCItemType } from "fumadocs-core/toc";
import { HomeLayout, type HomeLayoutProps } from "fumadocs-ui/layouts/home";
import { ChevronDown, List } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PostTOCContextType = {
  toc: TOCItemType[];
  setToc: Dispatch<SetStateAction<TOCItemType[]>>;
};

const PostTOCContext = createContext<PostTOCContextType | null>(null);

export function usePostTOC() {
  const ctx = use(PostTOCContext);
  if (!ctx) throw new Error("usePostTOC must be used within PostLayout");
  return ctx;
}

type PostLayoutProps = HomeLayoutProps & {
  children: ReactNode;
};

export function PostLayout({ children, ...props }: PostLayoutProps) {
  const [toc, setToc] = useState<TOCItemType[]>([]);
  const hasToc = toc.length > 0;

  return (
    <PostTOCContext value={{ toc, setToc }}>
      <HomeLayout {...props}>
        {hasToc && <MobileTOCBar items={toc} />}
        {children}
      </HomeLayout>
    </PostTOCContext>
  );
}

function MobileTOCBar({ items }: { items: TOCItemType[] }) {
  return (
    <Collapsible className="sticky top-14 z-30 border-b bg-fd-background/95 backdrop-blur-sm xl:hidden">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium">
        <List className="size-4 text-fd-muted-foreground" />
        On this page
        <ChevronDown className="ml-auto size-4 text-fd-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <nav className="flex flex-col gap-1 px-4 pb-3 text-sm">
          {items.map((item) => (
            <a
              key={item.url}
              href={item.url}
              className={cn(
                "py-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground",
              )}
              style={{
                paddingInlineStart: 12 * Math.max(item.depth - 1, 0),
              }}
            >
              {item.title}
            </a>
          ))}
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}
