import { readFile } from "node:fs/promises";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HomeLayout } from "@/components/layout/home";
import { TagBadge } from "@/components/tag-badge";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";

/** Extract first paragraph from MDX content (after frontmatter), trimmed to ~100 chars */
async function getExcerpt(absolutePath: string, maxLen = 100): Promise<string> {
  try {
    const content = await readFile(absolutePath, "utf-8");
    // Remove frontmatter (between --- delimiters)
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, "");
    // Get first non-empty paragraph (skip headings, imports, empty lines)
    const lines = withoutFrontmatter.split("\n");
    let paragraph = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("import "))
        continue;
      paragraph = trimmed;
      break;
    }
    if (!paragraph) return "";
    // Strip markdown links, bold, italic for cleaner excerpt
    const clean = paragraph
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
      .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** -> bold
      .replace(/\*([^*]+)\*/g, "$1"); // *italic* -> italic
    return clean.length > maxLen ? `${clean.slice(0, maxLen).trim()}…` : clean;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/posts/")({
  loader: () => serverLoader(),
  component: BlogIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const pages = posts.getPages();
  const sorted = pages.sort((a, b) => {
    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
    return dateB - dateA;
  });

  const postsWithExcerpts = await Promise.all(
    sorted.map(async (page) => ({
      url: page.url,
      title: page.data.title,
      tags: page.data.tags ?? [],
      excerpt: page.absolutePath ? await getExcerpt(page.absolutePath) : "",
      date: page.data.date,
      author: page.data.author,
    })),
  );

  return { posts: postsWithExcerpts };
});

function BlogIndex() {
  const { posts } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
        </header>

        <div className="group/list space-y-1">
          {posts.map((post) => (
            <Link
              key={post.url}
              to={post.url}
              className="group/item block -mx-4 px-4 py-4 rounded-lg transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:opacity-100!"
            >
              <article className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6">
                <time
                  className="text-sm text-muted-foreground shrink-0 tabular-nums sm:w-28"
                  title={post.date ? formatDateTime(post.date) : undefined}
                >
                  {post.date && formatDate(post.date)}
                </time>
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium font-sans group-hover/item:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} size="inline" />
                      ))}
                    </div>
                  )}
                  {post.excerpt && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1 group-hover/item:text-muted-foreground/80">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <p className="text-muted-foreground">No posts yet.</p>
        )}
      </main>
    </HomeLayout>
  );
}
