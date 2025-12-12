import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import { posts } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { TagBadge } from "@/components/tag-badge";

export const Route = createFileRoute("/posts/")({
  loader: () => serverLoader(),
  component: PostsIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const pages = posts.getPages();
  const sorted = pages.sort((a, b) => {
    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
    return dateB - dateA;
  });

  return {
    posts: sorted.map((page) => ({
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      author: page.data.author,
      tags: page.data.tags ?? [],
    })),
  };
});

function formatDate(dateStr: string | Date) {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PostsIndex() {
  const { posts } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Writing</h1>
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
                  {post.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <TagBadge
                          key={tag}
                          tag={tag}
                          size="sm"
                          linked={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <p className="text-fd-muted-foreground">Nothing here yet.</p>
        )}
      </main>
    </HomeLayout>
  );
}
