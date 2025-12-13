import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "fumadocs-mdx:collections/browser";
import type { TOCItemType } from "fumadocs-core/toc";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect } from "react";
import { formatDateTime, formatRelativeTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { TagBadge } from "@/components/tag-badge";
import { TOCProvider, TOCScrollArea } from "@/components/toc";
import { TOCItems } from "@/components/toc/clerk";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";
import { PostLayout, usePostTOC } from "@/components/layout/post";

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

    // sort all posts by date ascending (oldest first)
    const allPages = posts.getPages().sort((a, b) => {
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
  const { setToc } = usePostTOC();

  useEffect(() => {
    setToc(toc ?? []);
    return () => setToc([]);
  }, [toc, setToc]);

  return (
    <div className="prose prose-fd max-w-none overflow-x-hidden">
      {children}
    </div>
  );
}

function SidebarTOC() {
  const { toc } = usePostTOC();
  if (toc.length === 0) return null;

  return (
    <TOCProvider toc={toc}>
      <aside className="fixed top-44 right-[max(1rem,calc((100vw-42rem)/2-16rem))] hidden h-fit max-h-[calc(100vh-12rem)] w-56 xl:block">
        <p className="mb-2 text-sm font-medium text-fd-muted-foreground">
          On this page
        </p>
        <TOCScrollArea className="relative">
          <TOCItems />
        </TOCScrollArea>
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
    <nav className="mt-12 grid grid-cols-2 gap-4 border-t border-fd-border pt-8">
      {previous ? (
        <Link
          to={previous.url}
          className="group flex items-center gap-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        >
          <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide">Previous</div>
            <div className="truncate font-medium text-fd-foreground">
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
          className="group flex items-center justify-end gap-2 text-right text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        >
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide">Next</div>
            <div className="truncate font-medium text-fd-foreground">
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

  return (
    <PostLayout {...baseOptions()}>
      <article className="mx-auto w-full max-w-2xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-3 sm:text-4xl">{data.title}</h1>
          <div className="mb-2 flex gap-4 text-sm text-fd-muted-foreground">
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
          </div>

          <div className="mt-8 h-px w-full bg-fd-border" />
          <div className="mt-4 flex items-center justify-between gap-4">
            {data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
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
          <div className="my-4 h-px w-full bg-fd-border" />
        </header>
        <Content />
        <PostNavigation previous={data.previous} next={data.next} />
      </article>
      <SidebarTOC />
    </PostLayout>
  );
}
