import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "fumadocs-mdx:collections/browser";
import { findNeighbour } from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { formatDate } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { TagBadge } from "@/components/tag-badge";
import { TOCProvider, TOCScrollArea } from "@/components/toc";
import { TOCItems } from "@/components/toc/default";
import { InlineTOC } from "@/components/inline-toc";
import { LLMCopyButton, ViewOptions } from "@/components/page-actions";

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

    const tree = posts.getPageTree();
    const { previous, next } = findNeighbour(tree, page.url);

    const toLink = (node: typeof previous | typeof next): NeighbourLink => {
      if (!node) return null;
      const nodePage = posts.getNodePage(node);
      const title =
        nodePage?.data.title ??
        (typeof node.name === "string" ? node.name : node.url);
      return { url: node.url, title };
    };

    return {
      slug,
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      author: page.data.author,
      tags: page.data.tags ?? [],
      previous: toLink(previous),
      next: toLink(next),
    };
  });

const clientLoader = browserCollections.posts.createClientLoader({
  component({ toc, default: MDX }) {
    return (
      <>
        <PostContent toc={toc}>
          <MDX components={getMDXComponents()} />
        </PostContent>
        <SidebarTOC toc={toc} />
      </>
    );
  },
});

function PostContent({
  toc,
  children,
}: {
  toc: TOCItemType[];
  children: React.ReactNode;
}) {
  return (
    <TOCProvider toc={toc}>
      {/* Mobile: inline TOC */}
      <InlineTOC items={toc} className="mb-8 lg:hidden" />
      <div className="prose prose-fd">{children}</div>
    </TOCProvider>
  );
}

function SidebarTOC({ toc }: { toc: TOCItemType[] }) {
  if (toc.length === 0) return null;

  return (
    <TOCProvider toc={toc}>
      <aside className="fixed right-[max(1rem,calc((100vw-48rem)/2-14rem-2rem))] top-24 hidden h-fit max-h-[calc(100vh-8rem)] w-56 xl:block">
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

  return (
    <HomeLayout {...baseOptions()}>
      <article className="mx-auto max-w-2xl w-2xl px-4 py-12">
        <header className="mb-8">
          <div className="mb-2 flex gap-4 text-sm text-fd-muted-foreground">
            {data.date && <time>{formatDate(data.date)}</time>}
            {data.author && <span>by {data.author}</span>}
          </div>
          <h1 className="text-4xl font-bold">{data.title}</h1>
          {data.description && (
            <p className="mt-3 text-lg text-fd-muted-foreground">
              {data.description}
            </p>
          )}
          {data.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-row gap-2 items-center border-t border-fd-border pt-4">
            <LLMCopyButton markdownUrl={`/posts/${data.slug}.mdx`} />
            <ViewOptions
              markdownUrl={`/posts/${data.slug}.mdx`}
              githubUrl={`https://github.com/caulk-dev/caulk.lol/blob/main/content/posts/${data.slug}.mdx`}
            />
          </div>
        </header>
        <Content />
        <PostNavigation previous={data.previous} next={data.next} />
      </article>
    </HomeLayout>
  );
}
