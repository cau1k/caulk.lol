import { type LinkPreviewResponse, linkPreviewResponseSchema } from "@caulk.lol/api/link-preview";
import { type GoodLink, linksResponseSchema } from "@caulk.lol/api/links";
import { env } from "@caulk.lol/env/web";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type PointerEvent, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { formatDate } from "@/lib/format-date";
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

type HoverPreviewImage = {
  src: string;
};

type LinkDayGroup = {
  dateLabel: string;
  start: number;
  items: LinkListItem[];
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
  const groups = groupLinkItemsByDay(items);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Good Links</h1>
          <p className="mt-4 text-muted-foreground">Things worth someone else's time.</p>
        </header>

        {groups.length > 0 ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.dateLabel}>
                <h2 className="mb-4 text-sm font-medium tracking-tight text-muted-foreground">
                  {group.dateLabel}
                </h2>
                <ol className="group/list list-decimal space-y-5 pl-6" start={group.start}>
                  {group.items.map((item) => (
                    <LinkRow key={item.link.id} item={item} />
                  ))}
                </ol>
              </section>
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
  const { link, preview } = item;
  const hoverImage = hoverPreviewImage(preview);
  const shouldReduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.45 });
  const springY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.45 });
  const [hasActivatedPreview, setHasActivatedPreview] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const domain = displayDomain(link.url);

  function updatePreviewPosition(event: PointerEvent<HTMLLIElement>) {
    if (!hoverImage || shouldReduceMotion || event.pointerType === "touch") return;

    const position = previewPosition(event);
    x.set(position.x);
    y.set(position.y);
  }

  function handlePointerEnter(event: PointerEvent<HTMLLIElement>) {
    if (!hoverImage || shouldReduceMotion || event.pointerType === "touch") return;

    updatePreviewPosition(event);
    setHasActivatedPreview(true);
    setIsPreviewVisible(true);
  }

  function handlePointerLeave() {
    setIsPreviewVisible(false);
  }

  return (
    <li
      className="relative pl-1 transition-opacity duration-150 ease-out group-has-hover/list:opacity-45 hover:opacity-100!"
      onPointerEnter={handlePointerEnter}
      onPointerMove={updatePreviewPosition}
      onPointerLeave={handlePointerLeave}
    >
      <div className="group/entry rounded-sm px-1 py-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium leading-snug text-foreground underline-offset-4 transition-colors group-hover/entry:text-primary group-hover/entry:underline hover:text-primary hover:underline"
          >
            {link.title}
          </a>
          <span className="font-mono text-[11px] leading-none text-muted-foreground">
            [{domain}]
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{link.reason}</p>
      </div>

      {hoverImage && !shouldReduceMotion && hasActivatedPreview ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 hidden h-28 w-52 overflow-hidden rounded-md border border-border/60 bg-background shadow-[0_16px_50px_rgb(0_0_0/0.22)] md:block motion-reduce:hidden"
          style={{ x: springX, y: springY }}
          animate={{ opacity: isPreviewVisible ? 1 : 0, scale: isPreviewVisible ? 1 : 0.98 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <img src={hoverImage.src} alt="" className="h-full w-full object-cover" />
        </motion.div>
      ) : null}
    </li>
  );
}

function groupLinkItemsByDay(items: LinkListItem[]): LinkDayGroup[] {
  const groups: LinkDayGroup[] = [];
  let currentGroup: LinkDayGroup | undefined;

  items.forEach((item, index) => {
    const dateLabel = formatDate(item.link.createdAt) || "Unknown date";

    if (!currentGroup || currentGroup.dateLabel !== dateLabel) {
      currentGroup = { dateLabel, start: index + 1, items: [] };
      groups.push(currentGroup);
    }

    currentGroup.items.push(item);
  });

  return groups;
}

function hoverPreviewImage(
  preview: LinkPreviewResponse | undefined,
): HoverPreviewImage | undefined {
  if (!preview) return undefined;

  if (preview.preview.kind === "generic" && preview.preview.imageUrl) {
    return { src: preview.preview.imageUrl };
  }

  if (preview.preview.kind === "youtube" && preview.preview.thumbnailUrl) {
    return { src: preview.preview.thumbnailUrl };
  }

  if (preview.preview.kind === "tweet") {
    const tweetImage = tweetPreviewImage(preview.preview.data);
    return tweetImage ? { src: tweetImage } : undefined;
  }

  return undefined;
}

function tweetPreviewImage(data: Record<string, unknown>): string | undefined {
  const photos = arrayValue(data.photos);
  const photoUrl = firstImageUrl(photos, ["url", "media_url_https"]);
  if (photoUrl) return photoUrl;

  const mediaDetails = arrayValue(data.mediaDetails);
  return firstImageUrl(mediaDetails, ["media_url_https", "url"]);
}

function firstImageUrl(items: readonly unknown[], keys: readonly string[]): string | undefined {
  for (const item of items) {
    const record = recordValue(item);
    if (!record) continue;

    for (const key of keys) {
      const value = stringValue(record[key]);
      if (value) return value;
    }
  }

  return undefined;
}

function previewPosition(event: PointerEvent<HTMLLIElement>) {
  const previewWidth = 208;
  const previewHeight = 112;
  const margin = 12;
  const offset = 18;
  const viewport = event.currentTarget.ownerDocument.documentElement;
  const maxX = viewport.clientWidth - previewWidth - margin;
  const maxY = viewport.clientHeight - previewHeight - margin;
  const preferredX = event.clientX + offset;
  const preferredY = event.clientY + offset;
  const x = preferredX > maxX ? event.clientX - previewWidth - offset : preferredX;
  const y = preferredY > maxY ? event.clientY - previewHeight - offset : preferredY;

  return {
    x: Math.max(margin, Math.min(x, maxX)),
    y: Math.max(margin, Math.min(y, maxY)),
  };
}

function displayDomain(url: string) {
  const hostname = new URL(url).hostname;
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function arrayValue(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
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
