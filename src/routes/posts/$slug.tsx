import browserCollections from "fumadocs-mdx:collections/browser";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { TOCItemType } from "fumadocs-core/toc";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { PostLayout, usePostTOC } from "@/components/layout/post";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { TagBadgeList } from "@/components/tag-badge";
import { TOCProvider } from "@/components/toc";
import { WheelTOCItems } from "@/components/toc/wheel";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelativeTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.slug });
    await clientLoader.preload(data.path);
    return data;
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
    const isDev = process.env.NODE_ENV === "development";
    if (page.data.draft && !isDev) throw notFound();

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

    return {
      slug,
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      updatedAt: page.data.updatedAt,
      author: page.data.author,
      tags: page.data.tags ?? [],
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

  const dateTime = data.date ? formatDateTime(data.date) : "";
  const relative = data.date ? formatRelativeTime(data.date) : "";
  const machineDateTime = data.date
    ? new Date(data.date).toISOString()
    : undefined;
  const updatedAtDateTime = data.updatedAt
    ? formatDateTime(data.updatedAt)
    : "";
  const machineUpdatedAt = data.updatedAt
    ? new Date(data.updatedAt).toISOString()
    : undefined;

  return (
    <PostLayout {...baseOptions()}>
      <article className="relative mx-auto w-full max-w-2xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-3 sm:text-4xl">{data.title}</h1>
          <div className="mb-2 flex gap-4 text-sm text-muted-foreground">
            {data.date && (
              <time
                className="tabular-nums"
                dateTime={machineDateTime}
                title={dateTime}
              >
                {dateTime}
                {relative ? ` · ${relative}` : ""}
              </time>
            )}
            {data.updatedAt && (
              <time
                className="tabular-nums text-muted-foreground/70"
                dateTime={machineUpdatedAt}
                title={`Updated: ${updatedAtDateTime}`}
              >
                (updated {updatedAtDateTime})
              </time>
            )}
          </div>

          <div className="mt-8 h-px w-full bg-border" />
          <div className="mt-4 flex items-center justify-between gap-4">
            {data.tags.length > 0 ? (
              <TagBadgeList tags={data.tags} mobileLimit={2} size="inline" />
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <LLMCopyButton markdownUrl={`/posts/${data.slug}.mdx`} />
              <ViewOptions
                markdownUrl={`/posts/${data.slug}.mdx`}
                githubUrl={`https://github.com/cau1k/caulk.lol/blob/main/content/posts/${data.slug}.mdx`}
              />
            </div>
          </div>
          <div className="my-4 h-px w-full bg-border" />
        </header>
        <Content />
        <PostNavigation previous={data.previous} next={data.next} />
      </article>
      <SidebarTOC />
    </PostLayout>
  );
}
