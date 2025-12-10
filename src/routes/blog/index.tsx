import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import { blog } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/blog/")({
  loader: () => serverLoader(),
  component: BlogIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const pages = blog.getPages();
  return {
    posts: pages.map((page) => ({
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      author: page.data.author,
    })),
  };
});

function BlogIndex() {
  const { posts } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Blog</h1>
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.url}
              to={post.url}
              className="block rounded-lg border border-fd-border bg-fd-card p-6 transition-colors hover:bg-fd-accent"
            >
              <h2 className="text-xl font-semibold">{post.title}</h2>
              {post.description && (
                <p className="mt-2 text-fd-muted-foreground">
                  {post.description}
                </p>
              )}
              <div className="mt-3 flex gap-4 text-sm text-fd-muted-foreground">
                {post.date && (
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                )}
                {post.author && <span>by {post.author}</span>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </HomeLayout>
  );
}
