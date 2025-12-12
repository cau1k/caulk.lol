import { createFileRoute, notFound } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "fumadocs-mdx:collections/browser";
import { posts } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { getMDXComponents } from "@/mdx-components";
import { TagBadge } from "@/components/tag-badge";
import { TOCProvider, TOCScrollArea } from "@/components/toc";
import { TOCItems } from "@/components/toc/default";
import type { TOCItemType } from "fumadocs-core/toc";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.slug });
    await clientLoader.preload(data.path);
    return data;
  },
  component: Post,
});

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const page = posts.getPage([slug]);
    if (!page) throw notFound();

    return {
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      author: page.data.author,
      tags: page.data.tags ?? [],
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
  toc: TOCItemType[];
  children: React.ReactNode;
}) {
  return (
    <TOCProvider toc={toc}>
      <div className="flex gap-8">
        <div className="prose prose-fd min-w-0 flex-1">{children}</div>
        <aside className="sticky top-24 hidden h-fit max-h-[calc(100vh-8rem)] w-56 shrink-0 lg:block">
          <p className="mb-2 text-sm font-medium text-fd-muted-foreground">
            On this page
          </p>
          <TOCScrollArea className="relative">
            <TOCItems />
          </TOCScrollArea>
        </aside>
      </div>
    </TOCProvider>
  );
}

function Post() {
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);

  return (
    <HomeLayout {...baseOptions()}>
      <article className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-8">
          <div className="mb-2 flex gap-4 text-sm text-fd-muted-foreground">
            {data.date && (
              <time>{new Date(data.date).toLocaleDateString()}</time>
            )}
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
        </header>
        <Content />
      </article>
    </HomeLayout>
  );
}
