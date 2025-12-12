import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import { posts } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { formatDate } from "@/lib/format-date";

export const Route = createFileRoute("/posts/tags/$tag")({
  loader: ({ params }) => serverLoader({ data: params.tag }),
  component: TagPosts,
});

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((tag: string) => tag)
  .handler(async ({ data: tag }) => {
    const normalized = tag.toLowerCase();
    const pages = posts
      .getPages()
      .filter((p) => {
        const tags = p.data.tags ?? [];
        return tags.some((t) => t.toLowerCase() === normalized);
      })
      .sort((a, b) => {
        const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
        const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
        return dateB - dateA;
      });

    if (pages.length === 0) throw notFound();

    return {
      tag: normalized,
      posts: pages.map((p) => ({
        url: p.url,
        title: p.data.title,
        description: p.data.description,
        date: p.data.date,
        author: p.data.author,
        tags: p.data.tags ?? [],
      })),
    };
  });

function TagPosts() {
  const { tag, posts } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          {/* <Link */}
          {/*   to="/posts/tags" */}
          {/*   className="mb-4 inline-flex items-center text-sm text-fd-muted-foreground hover:text-fd-foreground transition-colors" */}
          {/* > */}
          {/*   <span className="mr-1">&larr;</span> All tags */}
          {/* </Link> */}
          <h1 className="text-3xl font-bold tracking-tight">
            {posts.length === 1 ? "post" : "posts"} posts tagged with "{tag}"
          </h1>
          <p className="mt-2 text-fd-muted-foreground">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </p>
        </header>

        <div className="space-y-1">
          {posts.map((post) => (
            <Link
              key={post.url}
              to={post.url}
              className="group block -mx-4 px-4 py-4 rounded-lg transition-colors hover:bg-fd-accent/50"
            >
              <article className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                <time className="text-sm text-fd-muted-foreground shrink-0 tabular-nums sm:w-28">
                  {post.date && formatDate(post.date)}
                </time>
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium group-hover:text-fd-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.description && (
                    <p className="mt-1 text-sm text-fd-muted-foreground line-clamp-1 group-hover:text-fd-muted-foreground/80">
                      {post.description}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </HomeLayout>
  );
}
