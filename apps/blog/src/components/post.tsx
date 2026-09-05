import browserCollections from "fumadocs-mdx:collections/browser";
import type { TOCItemType } from "fumadocs-core/toc";
import { type ReactNode, useEffect, useRef } from "react";
import { usePostTOC } from "@/components/layout/post";
import { getMDXComponents } from "@/mdx-components";

// Share the loader's preload cache with the renderer, but import this module
// only for posts. Defining it in the route makes its MDX/UI dependencies eager
// dependencies of the whole route tree, including the homepage.
export const clientLoader = browserCollections.posts.createClientLoader({
  component({ toc, default: MDX }) {
    return (
      <PostContent toc={toc}>
        <MDX components={getMDXComponents()} />
      </PostContent>
    );
  },
});

function PostContent({ toc, children }: { toc?: TOCItemType[]; children: ReactNode }) {
  const { setToc, setContentVisible } = usePostTOC();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToc(toc ?? []);
    return () => setToc([]);
  }, [toc, setToc]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setContentVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [setContentVisible]);

  return (
    <div className="prose prose-fd max-w-none overflow-x-hidden">
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      {children}
    </div>
  );
}
