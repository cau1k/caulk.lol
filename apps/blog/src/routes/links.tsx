import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { type GoodLink, listLinks, requireLinksDb } from "@/lib/links/queries";

export const Route = createFileRoute("/links")({
  loader: () => serverLoader(),
  component: LinksPage,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return { links: await listLinks(requireLinksDb()) };
  } catch (error) {
    return {
      links: [] as GoodLink[],
      error: error instanceof Error ? error.message : "Failed to load links.",
    };
  }
});

function LinksPage() {
  const { links, error } = Route.useLoaderData() as {
    links: GoodLink[];
    error?: string;
  };

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Good Links</h1>
          <p className="mt-4 text-muted-foreground">
            Things worth someone else's time.
          </p>
        </header>

        {links.length > 0 ? (
          <div className="group/list">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={error ? "Links unavailable" : "No links yet"}
            description={error ?? "Curated links will land here."}
            action={{ label: "Back to home", to: "/" }}
          />
        )}
      </main>
    </HomeLayout>
  );
}

function LinkRow({ link }: { link: GoodLink }) {
  return (
    <article className="-mx-3 px-3 py-5 transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:opacity-100!">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <a
          href={link.url}
          className="font-medium transition-colors hover:text-primary"
          target="_blank"
          rel="noreferrer"
        >
          {link.title}
        </a>
        <time
          className="text-sm text-muted-foreground shrink-0"
          title={formatDateTime(link.createdAt)}
        >
          {formatDate(link.createdAt)}
        </time>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {link.reason}
      </p>
      {link.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {link.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
