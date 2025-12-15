import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { LinkItem } from "@/components/layout/link-item";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";

export const Route = createFileRoute("/")({
  loader: () => serverLoader(),
  component: Home,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const isDev = import.meta.env.DEV;
  const pages = posts.getPages().filter((p) => isDev || !p.data.draft);
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
    })),
  };
});

function Home() {
  const { posts } = Route.useLoaderData();
  const [featured, ...rest] = posts;

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-16">
          <h1 className="text-4xl font-bold font-serif! tracking-tight mb-4">
            <LinkItem item={{ url: "https://x.com/zerocaulk" }}>
              @zerocaulk
            </LinkItem>
          </h1>
          <p className="text-muted-foreground text-lg">
            Thoughts on software, philosophy, and hacking on agent harnesses.
          </p>
        </header>

        {posts.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="New posts are on the way. Check back soon."
          />
        ) : (
          <>
            {featured && (
              <section className="mb-16">
                <Link to={featured.url} className="group block">
                  <article>
                    <time
                      className="text-sm text-muted-foreground"
                      title={
                        featured.date
                          ? formatDateTime(featured.date)
                          : undefined
                      }
                    >
                      {featured.date && formatDate(featured.date)}
                    </time>
                    <h2 className="text-2xl font-semibold mt-2 group-hover:text-primary transition-colors">
                      {featured.title}
                    </h2>
                    {featured.description && (
                      <p className="mt-3 text-muted-foreground leading-relaxed">
                        {featured.description}
                      </p>
                    )}
                    <span className="inline-block mt-4 text-sm font-medium text-primary group-hover:underline">
                      Read more
                    </span>
                  </article>
                </Link>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
                  Recent
                </h2>
                <div className="group/list space-y-1">
                  {rest.map((post) => (
                    <Link
                      key={post.url}
                      to={post.url}
                      className="group/item flex items-baseline justify-between gap-4 py-3 -mx-3 px-3 rounded-lg transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:!opacity-100"
                    >
                      <span className="font-medium group-hover/item:text-primary transition-colors truncate">
                        {post.title}
                      </span>
                      <time
                        className="text-sm text-muted-foreground shrink-0"
                        title={
                          post.date ? formatDateTime(post.date) : undefined
                        }
                      >
                        {post.date && formatDate(post.date)}
                      </time>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-20 pt-8 border-t border-border">
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link
              to="/posts"
              className="hover:text-foreground transition-colors"
            >
              All writing
            </Link>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
