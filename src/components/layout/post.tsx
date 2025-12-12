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
import { ChevronDown } from "lucide-react";
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
      <HomeLayout
        {...props}
        links={[
          ...(props.links ?? []),
          ...(hasToc
            ? [
                {
                  type: "custom" as const,
                  on: "menu" as const,
                  children: <MobileTOC items={toc} />,
                },
              ]
            : []),
        ]}
      >
        {children}
      </HomeLayout>
    </PostTOCContext>
  );
}

function MobileTOC({ items }: { items: TOCItemType[] }) {
  return (
    <Collapsible className="w-full border-t pt-4 mt-2">
      <CollapsibleTrigger className="group flex w-full items-center justify-between text-sm font-medium text-fd-muted-foreground">
        On this page
        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <nav className="flex flex-col gap-1 pt-2 text-sm">
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
