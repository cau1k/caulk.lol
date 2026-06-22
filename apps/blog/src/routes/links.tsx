import { type LinkPreviewResponse, linkPreviewResponseSchema } from "@caulk.lol/api/link-preview";
import { type GoodLink, linksResponseSchema } from "@caulk.lol/api/links";
import { env } from "@caulk.lol/env/web";
import { LinkPreviewCard } from "@caulk.lol/ui/components/link-preview";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";

type LinksLoaderData = {
  items: LinkListItem[];
  error?: string;
};

type LinkListItem = {
  link: GoodLink;
  preview?: LinkPreviewResponse;
  previewError?: string;
};

export const Route = createFileRoute("/links")({
  loader: () => serverLoader(),
  component: LinksPage,
});

const serverLoader = createServerFn({ method: "GET" }).handler(
  async (): Promise<LinksLoaderData> => {
    try {
      return { items: await fetchLinkItems() };
    } catch (error) {
      return {
        items: [],
        error: error instanceof Error ? error.message : "Failed to load links.",
      };
    }
  },
);

function LinksPage() {
  const { items, error } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Good Links</h1>
          <p className="mt-4 text-muted-foreground">Things worth someone else's time.</p>
        </header>

        {items.length > 0 ? (
          <div className="group/list">
            {items.map((item) => (
              <LinkRow key={item.link.id} item={item} />
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

function LinkRow({ item }: { item: LinkListItem }) {
  const { link, preview, previewError } = item;

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
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{link.reason}</p>
      {link.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {link.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      {preview ? (
        <LinkPreviewCard
          preview={preview}
          tweetApiUrl={(tweetId) => `/api/tweet/${tweetId}`}
          className="mt-4"
        />
      ) : previewError ? (
        <p className="mt-3 text-xs text-muted-foreground">Preview unavailable: {previewError}</p>
      ) : null}
    </article>
  );
}

async function fetchLinkItems(): Promise<LinkListItem[]> {
  const links = await fetchLinks();
  return await Promise.all(
    links.map(async (link) => {
      const preview = await loadPreview(link.url);
      return preview.status === "ok"
        ? { link, preview: preview.preview }
        : { link, previewError: preview.message };
    }),
  );
}

type PreviewLoadResult =
  | { status: "ok"; preview: LinkPreviewResponse }
  | { status: "error"; message: string };

async function loadPreview(url: string): Promise<PreviewLoadResult> {
  try {
    return { status: "ok", preview: await fetchLinkPreview(url) };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to load preview.",
    };
  }
}

async function fetchLinks(): Promise<GoodLink[]> {
  const response = await fetch(new URL("/api/links", env.VITE_SERVER_URL));
  if (!response.ok) {
    throw new Error(`Links API returned ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return linksResponseSchema.parse(payload).links;
}

async function fetchLinkPreview(url: string): Promise<LinkPreviewResponse> {
  const previewUrl = new URL("/api/link/preview", env.VITE_SERVER_URL);
  previewUrl.searchParams.set("url", url);
  const response = await fetch(previewUrl);
  if (!response.ok) throw new Error(`Link preview API returned ${response.status}.`);

  const payload: unknown = await response.json();
  return linkPreviewResponseSchema.parse(payload);
}
