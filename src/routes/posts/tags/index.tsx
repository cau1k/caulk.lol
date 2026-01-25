import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HomeLayout } from "@/components/layout/home";
import { TagBadge } from "@/components/tag-badge";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";

export const Route = createFileRoute("/posts/tags/")({
  loader: () => serverLoader(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  }),
  component: TagsIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const isDev = import.meta.env.DEV;
  const pages = posts.getPages().filter((p) => isDev || !p.data.draft);
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
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="mt-2 text-muted-foreground">Browse posts by topic</p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          {tags.map(({ tag, count }) => (
            <TagBadge
              key={tag}
              tag={tag}
              size="scaled"
              count={count}
              maxCount={maxCount}
              showCount
            />
          ))}
        </div>

        {tags.length === 0 && (
          <p className="text-muted-foreground">No tags yet.</p>
        )}
      </main>
    </HomeLayout>
  );
}
