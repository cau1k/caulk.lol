import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import browserCollections from "fumadocs-mdx:collections/browser";
import { posts } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { getMDXComponents } from "@/mdx-components";

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
      <>
        <InlineTOC items={toc} />
        <div className="prose prose-fd mt-6">
          <MDX components={getMDXComponents()} />
        </div>
      </>
    );
  },
});

function Post() {
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);

  return (
    <HomeLayout {...baseOptions()}>
      <article className="mx-auto max-w-3xl px-4 py-12">
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
                <Link
                  key={tag}
                  to="/posts/tags/$tag"
                  params={{ tag }}
                  className="bg-fd-muted px-3 py-1 text-xs font-sans hover:bg-fd-accent transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>
        <Content />
      </article>
    </HomeLayout>
  );
}
