import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import { posts } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/posts/tags/")({
  loader: () => serverLoader(),
  component: TagsIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const pages = posts.getPages();
  const counts = new Map<string, number>();

  for (const page of pages) {
    const tags = page.data.tags ?? [];
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const tagList = Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );

  return { tags: tagList };
});

function TagsIndex() {
  const { tags } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="mt-2 text-fd-muted-foreground">Browse posts by topic</p>
        </header>

        <div className="flex flex-wrap gap-3">
          {tags.map(({ tag, count }) => (
            <Link
              key={tag}
              to="/posts/tags/$tag"
              params={{ tag }}
              className="group flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-2 transition-colors hover:bg-fd-accent hover:border-fd-accent"
            >
              <span className="font-medium group-hover:text-fd-primary">
                #{tag}
              </span>
              <span className="text-sm text-fd-muted-foreground">{count}</span>
            </Link>
          ))}
        </div>

        {tags.length === 0 && (
          <p className="text-fd-muted-foreground">No tags yet.</p>
        )}
      </main>
    </HomeLayout>
  );
}
