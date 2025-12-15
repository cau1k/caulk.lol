import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";

export const Route = createFileRoute("/posts/upcoming")({
  loader: () => serverLoader(),
  component: UpcomingPosts,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const drafts = posts.getPages().filter((p) => p.data.draft);
  const sorted = drafts.sort((a, b) => {
    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
    return dateB - dateA;
  });

  return {
    posts: sorted.map((page) => ({
      title: page.data.title,
      description: page.data.description,
    })),
  };
});

function UpcomingPosts() {
  const { posts } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold font-serif tracking-tight">
            Upcoming
          </h1>
        </header>

        {posts.length === 0 ? (
          <EmptyState
            title="Nothing in the pipeline"
            description="All caught up! Check back later for new content."
            action={{ label: "Back to home", to: "/" }}
          />
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article key={post.title} className="group">
                <h2 className="font-medium font-sans text-foreground/80">
                  {post.title}
                </h2>
                {post.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {post.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-border">
          <Link
            to="/posts"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All writing
          </Link>
        </footer>
      </main>
    </HomeLayout>
  );
}
