import { type LinkPreviewResponse, linkPreviewResponseSchema } from "@caulk.lol/api/link-preview";
import { type GoodLink, linksResponseSchema } from "@caulk.lol/api/links";
import { env } from "@caulk.lol/env/web";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { type PointerEvent, useRef, useState } from "react";
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
  id: string;
  src: string;
};

type PreviewMotion = {
  x: number;
  y: number;
  rotate: number;
  velocity: PointerVelocity;
};

type PointerSample = {
  clientX: number;
  clientY: number;
  time: number;
};

type PointerVelocity = {
  x: number;
  y: number;
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
          <LinkGroups groups={groups} />
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

function LinkGroups({ groups }: { groups: LinkDayGroup[] }) {
  const shouldReduceMotion = useReducedMotion();
  const lastPointerSample = useRef<PointerSample | undefined>(undefined);
  const pointerVelocity = useRef<PointerVelocity>(zeroPointerVelocity());
  const isPreviewVisibleRef = useRef(false);
  const targetPreviewX = useMotionValue(0);
  const targetPreviewY = useMotionValue(0);
  const targetPreviewRotate = useMotionValue(0);
  const previewX = useSpring(targetPreviewX, { stiffness: 90, damping: 22, mass: 1.15 });
  const previewY = useSpring(targetPreviewY, { stiffness: 90, damping: 22, mass: 1.15 });
  const previewRotate = useSpring(targetPreviewRotate, {
    stiffness: 70,
    damping: 18,
    mass: 1.1,
  });
  const [activePreviewImage, setActivePreviewImage] = useState<HoverPreviewImage>();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  function setPreviewMotion(motion: PreviewMotion) {
    targetPreviewX.set(motion.x);
    targetPreviewY.set(motion.y);
    targetPreviewRotate.set(motion.rotate);
  }

  function jumpPreviewMotion(motion: PreviewMotion) {
    targetPreviewX.jump(motion.x);
    targetPreviewY.jump(motion.y);
    targetPreviewRotate.jump(motion.rotate);
    previewX.jump(motion.x);
    previewY.jump(motion.y);
    previewRotate.jump(motion.rotate);
  }

  function showPreview(image: HoverPreviewImage, event: PointerEvent<HTMLElement>) {
    if (shouldReduceMotion || event.pointerType === "touch") return;

    const shouldJump = !isPreviewVisibleRef.current;
    if (shouldJump) pointerVelocity.current = zeroPointerVelocity();

    const motion = previewMotion(
      event,
      shouldJump ? undefined : lastPointerSample.current,
      pointerVelocity.current,
    );

    pointerVelocity.current = motion.velocity;
    lastPointerSample.current = pointerSample(event);

    if (shouldJump) jumpPreviewMotion(motion);
    else setPreviewMotion(motion);

    setActivePreviewImage((currentImage) => {
      if (currentImage?.id === image.id && currentImage.src === image.src) return currentImage;
      return image;
    });
    isPreviewVisibleRef.current = true;
    setIsPreviewVisible(true);
  }

  function movePreview(event: PointerEvent<HTMLElement>) {
    if (shouldReduceMotion || event.pointerType === "touch" || !isPreviewVisibleRef.current) {
      return;
    }

    const motion = previewMotion(event, lastPointerSample.current, pointerVelocity.current);
    pointerVelocity.current = motion.velocity;
    lastPointerSample.current = pointerSample(event);
    setPreviewMotion(motion);
  }

  function hidePreview() {
    lastPointerSample.current = undefined;
    pointerVelocity.current = zeroPointerVelocity();
    targetPreviewRotate.set(0);
    isPreviewVisibleRef.current = false;
    setIsPreviewVisible(false);
  }

  return (
    <div className="space-y-10" onPointerLeave={hidePreview}>
      {groups.map((group) => (
        <section key={group.dateLabel}>
          <h2
            className="mb-4 font-sans text-xl font-medium tracking-tight text-foreground"
            onPointerEnter={hidePreview}
          >
            {group.dateLabel}
          </h2>
          <ol className="group/list list-decimal pl-6" start={group.start}>
            {group.items.map((item) => (
              <LinkRow
                key={item.link.id}
                item={item}
                onPreviewClear={hidePreview}
                onPreviewEnter={showPreview}
                onPreviewMove={movePreview}
              />
            ))}
          </ol>
        </section>
      ))}

      {activePreviewImage && !shouldReduceMotion ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 hidden h-28 w-52 overflow-hidden rounded-md border border-border/60 bg-background shadow-[0_16px_50px_rgb(0_0_0/0.22)] will-change-transform md:block motion-reduce:hidden"
          style={{ x: previewX, y: previewY, rotate: previewRotate }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: isPreviewVisible ? 1 : 0,
            scale: isPreviewVisible ? 1 : 0.98,
          }}
          transition={{
            opacity: { duration: 0.16, ease: "easeOut" },
            scale: { duration: 0.16, ease: "easeOut" },
          }}
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={`${activePreviewImage.id}:${activePreviewImage.src}`}
              src={activePreviewImage.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        </motion.div>
      ) : null}
    </div>
  );
}

type LinkRowProps = {
  item: LinkListItem;
  onPreviewClear: () => void;
  onPreviewEnter: (image: HoverPreviewImage, event: PointerEvent<HTMLElement>) => void;
  onPreviewMove: (event: PointerEvent<HTMLElement>) => void;
};

function LinkRow({ item, onPreviewClear, onPreviewEnter, onPreviewMove }: LinkRowProps) {
  const { link } = item;
  const hoverImage = hoverPreviewImage(item);
  const domain = displayDomain(link.url);

  function handlePointerEnter(event: PointerEvent<HTMLLIElement>) {
    if (!hoverImage) {
      onPreviewClear();
      return;
    }

    onPreviewEnter(hoverImage, event);
  }

  function handlePointerMove(event: PointerEvent<HTMLLIElement>) {
    if (!hoverImage) return;
    onPreviewMove(event);
  }

  return (
    <li
      className="group/entry relative py-2.5 pl-1 transition-opacity duration-150 ease-out group-has-hover/list:opacity-45 hover:opacity-100!"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
    >
      <div className="rounded-sm px-1">
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

function hoverPreviewImage(item: LinkListItem): HoverPreviewImage | undefined {
  const { link, preview } = item;
  if (!preview) return undefined;

  if (preview.preview.kind === "generic" && preview.preview.imageUrl) {
    return { id: link.id, src: preview.preview.imageUrl };
  }

  if (preview.preview.kind === "youtube" && preview.preview.thumbnailUrl) {
    return { id: link.id, src: preview.preview.thumbnailUrl };
  }

  if (preview.preview.kind === "tweet") {
    const tweetImage = tweetPreviewImage(preview.preview.data);
    return tweetImage ? { id: link.id, src: tweetImage } : undefined;
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

function previewMotion(
  event: PointerEvent<HTMLElement>,
  previousSample?: PointerSample,
  previousVelocity: PointerVelocity = zeroPointerVelocity(),
): PreviewMotion {
  const previewWidth = 208;
  const previewHeight = 112;
  const margin = 12;
  const offset = 18;
  const viewport = event.currentTarget.ownerDocument.documentElement;
  const maxX = viewport.clientWidth - previewWidth - margin;
  const maxY = viewport.clientHeight - previewHeight - margin;
  const dynamics = previewDynamics(pointerSample(event), previousSample, previousVelocity);
  const preferredX = event.clientX + offset + dynamics.driftX;
  const preferredY = event.clientY + offset + dynamics.driftY;
  const x = preferredX > maxX ? event.clientX - previewWidth - offset : preferredX;
  const y = preferredY > maxY ? event.clientY - previewHeight - offset : preferredY;

  return {
    x: Math.max(margin, Math.min(x, maxX)),
    y: Math.max(margin, Math.min(y, maxY)),
    rotate: dynamics.rotate,
    velocity: dynamics.velocity,
  };
}

function previewDynamics(
  sample: PointerSample,
  previousSample: PointerSample | undefined,
  previousVelocity: PointerVelocity,
) {
  if (!previousSample) {
    return { driftX: 0, driftY: 0, rotate: 0, velocity: zeroPointerVelocity() };
  }

  const elapsed = Math.max(16, sample.time - previousSample.time);
  const instantVelocityX = ((sample.clientX - previousSample.clientX) / elapsed) * 1_000;
  const instantVelocityY = ((sample.clientY - previousSample.clientY) / elapsed) * 1_000;
  const velocityX = lerp(previousVelocity.x, instantVelocityX, 0.16);
  const velocityY = lerp(previousVelocity.y, instantVelocityY, 0.16);
  const speed = Math.hypot(velocityX, velocityY);

  return {
    driftX: clamp(velocityX * 0.018, -18, 18),
    driftY: clamp(velocityY * 0.012 - speed * 0.003, -16, 14),
    rotate: clamp(velocityX * 0.003 + velocityY * 0.001, -3.5, 3.5),
    velocity: { x: velocityX, y: velocityY },
  };
}

function pointerSample(event: PointerEvent<HTMLElement>): PointerSample {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    time: event.timeStamp,
  };
}

function zeroPointerVelocity(): PointerVelocity {
  return { x: 0, y: 0 };
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
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
