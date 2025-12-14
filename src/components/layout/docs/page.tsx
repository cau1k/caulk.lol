"use client";

import { Link, usePathname } from "fumadocs-core/framework";
import type * as PageTree from "fumadocs-core/page-tree";
import { AnchorProvider, type TOCItemType } from "fumadocs-core/toc";
import { useTreeContext } from "fumadocs-ui/contexts/tree";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../../lib/cn";
import { TOCProvider } from "../../toc";
import { WheelTOCItems } from "../../toc/wheel";

export type DocsPageProps = {
  toc?: TOCItemType[];
  children: ReactNode;
};

export function DocsPage({ toc = [], ...props }: DocsPageProps) {
  return (
    <AnchorProvider toc={toc}>
      <TOCProvider toc={toc}>
        <main className="flex w-full min-w-0 flex-col">
          <article className="flex flex-1 flex-col w-full max-w-[860px] gap-6 px-4 py-8 md:px-6 md:mx-auto">
            {props.children}
            <Footer />
          </article>
        </main>
        {toc.length > 0 && <DocsTOCSidebar />}
      </TOCProvider>
    </AnchorProvider>
  );
}

function DocsTOCSidebar() {
  const [isFocused, setIsFocused] = useState(false);

  // Lock page scroll when interacting with the wheel
  // biome-ignore lint: scroll lock needs these listeners
  const scrollLockProps = {
    onPointerEnter: () => setIsFocused(true),
    onPointerLeave: () => setIsFocused(false),
    onWheel: (e: React.WheelEvent) => {
      if (isFocused) e.stopPropagation();
    },
  };

  return (
    <div
      className="sticky top-(--fd-nav-height) w-[286px] shrink-0 h-[calc(100dvh-var(--fd-nav-height))] p-4 overflow-hidden max-xl:hidden"
      {...scrollLockProps}
    >
      <p className="text-sm text-muted-foreground mb-2">On this page</p>
      <WheelTOCItems />
    </div>
  );
}

export function DocsBody(props: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("prose", props.className)}>
      {props.children}
    </div>
  );
}

export function DocsDescription(props: ComponentProps<"p">) {
  // don't render if no description provided
  if (props.children === undefined) return null;

  return (
    <p
      {...props}
      className={cn("mb-8 text-lg text-muted-foreground", props.className)}
    >
      {props.children}
    </p>
  );
}

export function DocsTitle(props: ComponentProps<"h1">) {
  return (
    <h1 {...props} className={cn("text-3xl font-semibold", props.className)}>
      {props.children}
    </h1>
  );
}

function Footer() {
  const { root } = useTreeContext();
  const pathname = usePathname();
  const flatten = useMemo(() => {
    const result: PageTree.Item[] = [];

    function scan(items: PageTree.Node[]) {
      for (const item of items) {
        if (item.type === "page") result.push(item);
        else if (item.type === "folder") {
          if (item.index) result.push(item.index);
          scan(item.children);
        }
      }
    }

    scan(root.children);
    return result;
  }, [root]);

  const { previous, next } = useMemo(() => {
    const idx = flatten.findIndex((item) => item.url === pathname);

    if (idx === -1) return {};
    return {
      previous: flatten[idx - 1],
      next: flatten[idx + 1],
    };
  }, [flatten, pathname]);

  return (
    <div className="flex flex-row justify-between gap-2 items-center font-medium">
      {previous ? <Link href={previous.url}>{previous.name}</Link> : null}
      {next ? <Link href={next.url}>{next.name}</Link> : null}
    </div>
  );
}
