import browserCollections from "fumadocs-mdx:collections/browser";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { TOCItemType } from "fumadocs-core/toc";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBackgroundStarsOptional } from "@/components/background-stars-context";
import { PostLayout, usePostTOC } from "@/components/layout/post";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { TOCProvider } from "@/components/toc";
import { WheelTOCItems } from "@/components/toc/wheel";
import { formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { getPostOgImageUrl } from "@/lib/og/urls";
import { calculateReadingTime, formatReadingTime } from "@/lib/reading-time";
import { posts } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.slug });
    await clientLoader.preload(data.path);
    return data;
  },
  // Blog posts rarely change - aggressive caching
  staleTime: Infinity,
  gcTime: 30 * 60_000, // 30 min memory retention
  headers: () => ({
    // CDN cache 1h, serve stale up to 7d while revalidating
    "Cache-Control":
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
  }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [] };
    }

    const ogImage = getPostOgImageUrl(loaderData.slug);
    const description = loaderData.description ?? "";

    return {
      meta: [
        { title: loaderData.title },
        { name: "description", content: description },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },
  component: Post,
});

type NeighbourLink = { url: string; title: string } | null;

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const page = posts.getPage([slug]);
    if (!page) throw notFound();

    // Block draft posts in production
    const isDev = import.meta.env.DEV;
    if (page.data.draft && !isDev) throw notFound();

    // Calculate reading time from MDX file content
    const mdxPath = join(process.cwd(), "content/posts", `${slug}.mdx`);
    let readingTime = 1;
    try {
      const content = await readFile(mdxPath, "utf-8");
      readingTime = calculateReadingTime(content);
    } catch {
      // Default to 1 min if file read fails
    }

    // sort all posts by date ascending (oldest first), exclude drafts in prod
    const allPages = posts
      .getPages()
      .filter((p) => isDev || !p.data.draft)
      .sort((a, b) => {
        const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
        const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
        return dateA - dateB;
      });

    const currentIndex = allPages.findIndex((p) => p.url === page.url);
    const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
    const nextPage =
      currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

    const toLink = (p: (typeof allPages)[number] | null): NeighbourLink => {
      if (!p) return null;
      return { url: p.url, title: p.data.title };
    };

    const tags = page.data.tags ?? [];

    return {
      slug,
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      updatedAt: page.data.updatedAt,
      author: page.data.author,
      tags,
      category: tags[0] ?? null,
      readingTime: formatReadingTime(readingTime),
      previous: toLink(prevPage),
      next: toLink(nextPage),
    };
  });

const clientLoader = browserCollections.posts.createClientLoader({
  component({ toc, default: MDX }) {
    return (
      <PostContent toc={toc}>
        <MDX components={getMDXComponents()} />
      </PostContent>
    );
  },
});

function PostContent({
  toc,
  children,
}: {
  toc?: TOCItemType[];
  children: React.ReactNode;
}) {
  const { setToc, setContentVisible } = usePostTOC();

  useEffect(() => {
    setToc(toc ?? []);
    return () => setToc([]);
  }, [toc, setToc]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // TOC visible when sentinel has scrolled past top of viewport
        setContentVisible(!entry.isIntersecting);
      },
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

function SidebarTOC() {
  const { toc } = usePostTOC();
  if (toc.length === 0) return null;

  return (
    <TOCProvider toc={toc}>
      <aside className="fixed top-16 right-[max(1rem,calc((100vw-42rem)/2-16rem))] hidden w-56 xl:flex xl:flex-col shadow-none">
        {/* <p className="mb-2 text-sm font-medium text-muted-foreground"> */}
        {/*   On this page */}
        {/* </p> */}
        <WheelTOCItems />
      </aside>
    </TOCProvider>
  );
}

function PostNavigation({
  previous,
  next,
}: {
  previous: NeighbourLink;
  next: NeighbourLink;
}) {
  if (!previous && !next) return null;

  return (
    <nav className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-8">
      {previous ? (
        <Link
          to={previous.url}
          className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide">Previous</div>
            <div className="truncate font-medium text-foreground">
              {previous.title}
            </div>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={next.url}
          className="group flex items-center justify-end gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide">Next</div>
            <div className="truncate font-medium text-foreground">
              {next.title}
            </div>
          </div>
          <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}

function Post() {
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);
  const starsCtx = useBackgroundStarsOptional();

  useEffect(() => {
    if (!starsCtx) return;
    starsCtx.setPaused(true);
    return () => {
      starsCtx.setPaused(false);
    };
  }, [starsCtx]);

  const dateTime = data.date ? formatDateTime(data.date) : "";
  const machineDateTime = data.date
    ? new Date(data.date).toISOString()
    : undefined;

  // Capitalize first letter only if tag is all lowercase, otherwise preserve original
  const category = data.category
    ? data.category === data.category.toLowerCase()
      ? data.category.charAt(0).toUpperCase() + data.category.slice(1)
      : data.category
    : null;

  return (
    <PostLayout {...baseOptions()}>
      <article className="relative mx-auto w-full max-w-2xl px-4 py-16 sm:py-20">
        <header className="mb-12">
          {/* Metadata line: Category · Date · Read time */}
          <div className="mb-6 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {category && (
              <>
                <span className="font-medium text-foreground">{category}</span>
                <span className="text-muted-foreground/50" aria-hidden>
                  ·
                </span>
              </>
            )}
            {data.date && (
              <>
                <time className="tabular-nums" dateTime={machineDateTime}>
                  {dateTime}
                </time>
                <span className="text-muted-foreground/50" aria-hidden>
                  ·
                </span>
              </>
            )}
            <span>{data.readingTime}</span>
          </div>

          {/* Title */}
          <h1 className="py-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {data.title}
          </h1>

          {/* Description */}
          {data.description && (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {data.description}
            </p>
          )}

          {/* Author + Actions row */}
          <div className="mt-8 mb-6 flex items-center justify-between gap-4">
            {data.author && (
              <span className="text-sm text-muted-foreground">
                {data.author}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <LLMCopyButton markdownUrl={`/posts/${data.slug}.mdx`} />
              <ViewOptions
                markdownUrl={`/posts/${data.slug}.mdx`}
                githubUrl={`https://github.com/cau1k/caulk.lol/blob/main/content/posts/${data.slug}.mdx`}
              />
            </div>
          </div>
          <div className="mt-8 h-px w-full bg-border" />
        </header>
        <Content />
        <PostNavigation previous={data.previous} next={data.next} />
      </article>
      <SidebarTOC />
    </PostLayout>
  );
}
