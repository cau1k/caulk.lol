import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { posts } from "@/lib/source";

type HomePost = {
  url: string;
  title: string;
  description?: string;
  date?: Date;
  author?: string;
};

export const Route = createFileRoute("/")({
  // Recent titles use regular serif; start its download with the document.
  head: () => ({
    links: [
      {
        rel: "preload",
        href: "/fonts/cmu-serif/cmunrm-webfont-latin-core.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
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
  const { posts } = Route.useLoaderData() as { posts: HomePost[] };
  const [featured, ...rest] = posts;

  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-4 pt-16">
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
                      title={featured.date ? formatDateTime(featured.date) : undefined}
                    >
                      {featured.date && formatDate(featured.date)}
                    </time>
                    <h2 className="mt-2 font-serif text-2xl font-semibold transition-colors group-hover:text-primary">
                      {featured.title}
                    </h2>
                    {featured.description && (
                      <p className="mt-3 text-muted-foreground leading-relaxed">
                        {featured.description}
                      </p>
                    )}
                    <span className="mt-4 inline-block text-sm font-medium text-primary group-hover:underline">
                      Read more
                    </span>
                  </article>
                </Link>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="mb-6 text-sm font-normal font-sans text-muted-foreground uppercase tracking-wider">
                  Recent
                </h2>
                <div className="group/list">
                  {rest.slice(0, 3).map((post) => (
                    <Link
                      key={post.url}
                      to={post.url}
                      className="group/item flex items-baseline justify-between gap-4 py-3 -mx-3 px-3 rounded-lg transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:!opacity-100"
                    >
                      <span className="truncate font-serif font-medium transition-colors group-hover/item:text-primary">
                        {post.title}
                      </span>
                      <time
                        className="text-sm text-muted-foreground shrink-0"
                        title={post.date ? formatDateTime(post.date) : undefined}
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
      </main>
    </>
  );
}
