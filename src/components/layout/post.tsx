"use client";

import type { TOCItemType } from "fumadocs-core/toc";
import { HomeLayout, type HomeLayoutProps } from "fumadocs-ui/layouts/home";
import { ChevronDown, List } from "lucide-react";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  use,
  useState,
} from "react";
import { TOCProvider } from "@/components/toc";
import { WheelTOCItems } from "@/components/toc/wheel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PostTOCContextType = {
  toc: TOCItemType[];
  setToc: Dispatch<SetStateAction<TOCItemType[]>>;
  contentVisible: boolean;
  setContentVisible: Dispatch<SetStateAction<boolean>>;
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
  const [contentVisible, setContentVisible] = useState(false);
  const hasToc = toc.length > 0;

  return (
    <PostTOCContext value={{ toc, setToc, contentVisible, setContentVisible }}>
      <HomeLayout {...props}>
        {hasToc && <MobileTOCBar items={toc} />}
        {children}
      </HomeLayout>
    </PostTOCContext>
  );
}

function MobileTOCBar({ items }: { items: TOCItemType[] }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TOCProvider toc={items}>
      <Collapsible className="sticky top-14 z-50 border-b bg-background xl:hidden">
        <div className="mx-auto w-full max-w-2xl px-4">
          <CollapsibleTrigger className="group flex w-full items-center gap-2 py-2.5 text-sm font-medium">
            <List className="size-4 text-muted-foreground" />
            On this page
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div
              className="pb-4"
              onPointerEnter={() => setIsFocused(true)}
              onPointerLeave={() => setIsFocused(false)}
              onWheel={(e) => isFocused && e.stopPropagation()}
            >
              <WheelTOCItems />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TOCProvider>
  );
}
