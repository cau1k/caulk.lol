import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { createServerFn } from "@tanstack/react-start";
import { posts } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import { TagBadge } from "@/components/tag-badge";

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

  const maxCount = tagList[0]?.count ?? 1;

  return { tags: tagList, maxCount };
});

function TagsIndex() {
  const { tags, maxCount } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="mt-2 text-fd-muted-foreground">Browse posts by topic</p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          {tags.map(({ tag, count }) => (
            <TagBadge
              key={tag}
              tag={tag}
              size="scaled"
              count={count}
              maxCount={maxCount}
            />
          ))}
        </div>

        {tags.length === 0 && (
          <p className="text-fd-muted-foreground">No tags yet.</p>
        )}
      </main>
    </HomeLayout>
  );
}
