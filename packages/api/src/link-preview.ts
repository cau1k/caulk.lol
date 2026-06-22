import { z } from "zod";

export type LinkPreviewCacheStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export const linkPreviewProviderSchema = z.enum(["tweet", "youtube", "generic", "unknown"]);
export const linkPreviewCacheSourceSchema = z.enum(["live", "cache", "stale"]);
export const linkPreviewFreshnessSchema = z.enum(["fresh", "stale", "miss"]);
export const linkPreviewUnavailableReasonSchema = z.enum([
  "invalid_url",
  "not_found",
  "metadata_missing",
  "non_html",
  "fetch_failed",
]);

const tweetDataSchema = z.record(z.string(), z.json());

const previewMetaSchema = z.object({
  sourceUrl: z.string(),
  canonicalUrl: z.string().url().nullable(),
  provider: linkPreviewProviderSchema,
  cacheKey: z.string().nullable(),
  cacheSource: linkPreviewCacheSourceSchema,
  freshness: linkPreviewFreshnessSchema,
  cachedAt: z.string().datetime().nullable(),
  fetchedAt: z.string().datetime().nullable(),
  maxAgeSeconds: z.number().int().positive(),
  warning: z.string().optional(),
});

export const tweetPreviewSchema = z.object({
  kind: z.literal("tweet"),
  tweetId: z.string(),
  url: z.string().url(),
  data: tweetDataSchema,
});

export const youtubePreviewSchema = z.object({
  kind: z.literal("youtube"),
  videoId: z.string(),
  url: z.string().url(),
  title: z.string(),
  authorName: z.string().optional(),
  authorUrl: z.string().url().optional(),
  providerName: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  thumbnailWidth: z.number().int().positive().optional(),
  thumbnailHeight: z.number().int().positive().optional(),
  html: z.string().optional(),
});

export const genericPreviewSchema = z.object({
  kind: z.literal("generic"),
  url: z.string().url(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  siteName: z.string().optional(),
});

export const unavailablePreviewSchema = z.object({
  kind: z.literal("unavailable"),
  provider: linkPreviewProviderSchema,
  reason: linkPreviewUnavailableReasonSchema,
  message: z.string(),
  url: z.string(),
  status: z.number().int().positive().optional(),
});

export const linkPreviewContentSchema = z.discriminatedUnion("kind", [
  tweetPreviewSchema,
  youtubePreviewSchema,
  genericPreviewSchema,
  unavailablePreviewSchema,
]);

export const linkPreviewResponseSchema = z.object({
  preview: linkPreviewContentSchema,
  meta: previewMetaSchema,
});

const cachedLinkPreviewSchema = z.object({
  schemaVersion: z.literal(1),
  cachedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  preview: linkPreviewContentSchema,
});

const youtubeOembedSchema = z.object({
  title: z.string().trim().min(1),
  author_name: z.string().trim().min(1).optional(),
  author_url: z.string().url().optional(),
  provider_name: z.string().trim().min(1).optional(),
  thumbnail_url: z.string().url().optional(),
  thumbnail_width: z.number().int().positive().optional(),
  thumbnail_height: z.number().int().positive().optional(),
  html: z.string().optional(),
});

type LinkPreviewTarget =
  | {
      provider: "tweet";
      sourceUrl: string;
      canonicalUrl: string;
      cacheKey: string;
      tweetId: string;
    }
  | {
      provider: "youtube";
      sourceUrl: string;
      canonicalUrl: string;
      cacheKey: string;
      videoId: string;
    }
  | {
      provider: "generic";
      sourceUrl: string;
      canonicalUrl: string;
      cacheKey: string;
    };

type InvalidPreviewTarget = {
  provider: "unknown";
  sourceUrl: string;
  canonicalUrl: null;
  cacheKey: null;
  reason: "invalid_url";
  message: string;
};

type LinkPreviewTargetResult = LinkPreviewTarget | InvalidPreviewTarget;
type CachedLinkPreview = z.infer<typeof cachedLinkPreviewSchema>;

export type LinkPreviewProvider = z.infer<typeof linkPreviewProviderSchema>;
export type LinkPreviewContent = z.infer<typeof linkPreviewContentSchema>;
export type LinkPreviewResponse = z.infer<typeof linkPreviewResponseSchema>;
export type LinkPreviewCacheSource = z.infer<typeof linkPreviewCacheSourceSchema>;

export type ResolveLinkPreviewOptions = {
  cache?: LinkPreviewCacheStore | null;
  forceRefresh?: boolean;
  now?: Date;
};

const linkPreviewVersion = "v1";
const tweetIdPattern = /^\d{1,32}$/;
const youtubeIdPattern = /^[a-zA-Z0-9_-]{6,128}$/;
const titlePattern = /<title[^>]*>(?<title>[\s\S]*?)<\/title>/i;
const metaTagPattern = /<meta\s+[^>]*>/gi;
const attributePattern = /(?<name>[a-zA-Z_:.-]+)\s*=\s*(?<quote>["'])(?<value>[\s\S]*?)\k<quote>/g;
const tweetFeatures = [
  "tfw_timeline_list:",
  "tfw_follower_count_sunset:true",
  "tfw_tweet_edit_backend:on",
  "tfw_refsrc_session:on",
  "tfw_fosnr_soft_interventions_enabled:on",
  "tfw_show_birdwatch_pivots_enabled:on",
  "tfw_show_business_verified_badge:on",
  "tfw_duplicate_scribes_to_settings:on",
  "tfw_use_profile_image_shape_enabled:on",
  "tfw_show_blue_verified_badge:on",
  "tfw_legacy_timeline_sunset:true",
  "tfw_show_gov_verified_badge:on",
  "tfw_show_business_affiliate_badge:on",
  "tfw_tweet_edit_frontend:on",
].join(";");

export async function resolveLinkPreview(
  url: string,
  options: ResolveLinkPreviewOptions = {},
): Promise<LinkPreviewResponse> {
  const now = options.now ?? new Date();
  const target = detectLinkPreviewTarget(url);

  if (target.provider === "unknown") {
    return createResponse({
      target,
      preview: unavailablePreview(target.sourceUrl, target.provider, target.reason, target.message),
      cacheSource: "live",
      freshness: "miss",
      cachedAt: null,
      fetchedAt: now.toISOString(),
    });
  }

  const cached = await readCachedLinkPreview(options.cache, target.cacheKey);
  if (cached && !options.forceRefresh && isFresh(cached, now)) {
    return createResponse({
      target,
      preview: cached.preview,
      cacheSource: "cache",
      freshness: "fresh",
      cachedAt: cached.cachedAt,
      fetchedAt: cached.fetchedAt,
    });
  }

  try {
    const preview = await fetchFreshPreview(target);
    const fetchedAt = now.toISOString();
    const cachedAt = now.toISOString();
    await writeCachedLinkPreview(options.cache, target.cacheKey, {
      schemaVersion: 1,
      cachedAt,
      fetchedAt,
      preview,
    });

    return createResponse({
      target,
      preview,
      cacheSource: "live",
      freshness: "fresh",
      cachedAt,
      fetchedAt,
    });
  } catch (error) {
    if (cached) {
      return createResponse({
        target,
        preview: cached.preview,
        cacheSource: "stale",
        freshness: "stale",
        cachedAt: cached.cachedAt,
        fetchedAt: cached.fetchedAt,
        warning: errorMessage(error),
      });
    }

    return createResponse({
      target,
      preview: unavailablePreview(
        target.canonicalUrl,
        target.provider,
        "fetch_failed",
        errorMessage(error),
      ),
      cacheSource: "live",
      freshness: "miss",
      cachedAt: null,
      fetchedAt: now.toISOString(),
      warning: errorMessage(error),
    });
  }
}

export async function resolveTweetEmbed(
  tweetId: string,
  options: ResolveLinkPreviewOptions = {},
): Promise<{ data: unknown; source: LinkPreviewCacheSource }> {
  if (!isTweetId(tweetId)) throw new Error("Invalid tweet id.");

  const result = await resolveLinkPreview(`https://x.com/i/status/${tweetId}`, options);
  if (result.preview.kind === "tweet") {
    return { data: result.preview.data, source: result.meta.cacheSource };
  }

  throw new Error(
    result.preview.kind === "unavailable" ? result.preview.message : "Tweet unavailable.",
  );
}

export function detectLinkPreviewTarget(value: string): LinkPreviewTargetResult {
  const parsed = parseHttpUrl(value);
  if (!parsed) {
    return {
      provider: "unknown",
      sourceUrl: value,
      canonicalUrl: null,
      cacheKey: null,
      reason: "invalid_url",
      message: "Preview URL must be an absolute http(s) URL.",
    };
  }

  const sourceUrl = parsed.toString();
  const tweetId = getTweetId(parsed);
  if (tweetId) {
    const canonicalUrl = `https://x.com/i/status/${tweetId}`;
    return {
      provider: "tweet",
      sourceUrl,
      canonicalUrl,
      cacheKey: `link-preview:${linkPreviewVersion}:tweet:${tweetId}`,
      tweetId,
    };
  }

  const videoId = getYouTubeVideoId(parsed);
  if (videoId) {
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      provider: "youtube",
      sourceUrl,
      canonicalUrl,
      cacheKey: `link-preview:${linkPreviewVersion}:youtube:${videoId}`,
      videoId,
    };
  }

  const canonicalUrl = normalizePreviewUrl(parsed);
  return {
    provider: "generic",
    sourceUrl,
    canonicalUrl,
    cacheKey: `link-preview:${linkPreviewVersion}:generic:${stableHash(canonicalUrl)}`,
  };
}

function createResponse({
  cachedAt,
  cacheSource,
  fetchedAt,
  freshness,
  preview,
  target,
  warning,
}: {
  cachedAt: string | null;
  cacheSource: LinkPreviewCacheSource;
  fetchedAt: string | null;
  freshness: z.infer<typeof linkPreviewFreshnessSchema>;
  preview: LinkPreviewContent;
  target: LinkPreviewTargetResult;
  warning?: string;
}): LinkPreviewResponse {
  return {
    preview,
    meta: {
      sourceUrl: target.sourceUrl,
      canonicalUrl: target.canonicalUrl,
      provider: target.provider,
      cacheKey: target.cacheKey,
      cacheSource,
      freshness,
      cachedAt,
      fetchedAt,
      maxAgeSeconds: getMaxAgeSeconds(preview),
      warning,
    },
  };
}

async function fetchFreshPreview(target: LinkPreviewTarget): Promise<LinkPreviewContent> {
  if (target.provider === "tweet") return fetchTweetPreview(target);
  if (target.provider === "youtube") return fetchYouTubePreview(target);
  return fetchGenericPreview(target);
}

async function fetchTweetPreview(target: Extract<LinkPreviewTarget, { provider: "tweet" }>) {
  const response = await fetch(getTweetUrl(target.tweetId), {
    headers: {
      Accept: "application/json",
      "User-Agent": "caulk.lol link preview cache",
    },
  });
  const data = await parseJsonResponse(response);

  if (response.ok) {
    if (isTweetTombstone(data)) {
      return unavailablePreview(target.canonicalUrl, "tweet", "not_found", "Tweet unavailable.");
    }

    if (isEmptyObject(data) || data === null) {
      return unavailablePreview(target.canonicalUrl, "tweet", "not_found", "Tweet not found.");
    }

    const tweetData = tweetDataSchema.safeParse(data);
    if (!tweetData.success) {
      return unavailablePreview(
        target.canonicalUrl,
        "tweet",
        "metadata_missing",
        "Tweet metadata was incomplete.",
      );
    }

    return {
      kind: "tweet",
      tweetId: target.tweetId,
      url: target.canonicalUrl,
      data: tweetData.data,
    } satisfies LinkPreviewContent;
  }

  if (response.status === 404) {
    return unavailablePreview(target.canonicalUrl, "tweet", "not_found", "Tweet not found.", 404);
  }

  throw new Error(await responseError(response, data, `Failed to fetch tweet ${target.tweetId}`));
}

async function fetchYouTubePreview(target: Extract<LinkPreviewTarget, { provider: "youtube" }>) {
  const url = new URL("https://www.youtube.com/oembed");
  url.searchParams.set("url", target.canonicalUrl);
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "caulk.lol link preview cache",
    },
  });
  const data = await parseJsonResponse(response);

  if (response.ok) {
    const parsed = youtubeOembedSchema.safeParse(data);
    if (!parsed.success) {
      return unavailablePreview(
        target.canonicalUrl,
        "youtube",
        "metadata_missing",
        "YouTube oEmbed metadata was incomplete.",
      );
    }

    return {
      kind: "youtube",
      videoId: target.videoId,
      url: target.canonicalUrl,
      title: parsed.data.title,
      authorName: parsed.data.author_name,
      authorUrl: parsed.data.author_url,
      providerName: parsed.data.provider_name,
      thumbnailUrl: parsed.data.thumbnail_url,
      thumbnailWidth: parsed.data.thumbnail_width,
      thumbnailHeight: parsed.data.thumbnail_height,
      html: parsed.data.html,
    } satisfies LinkPreviewContent;
  }

  if (response.status === 404) {
    return unavailablePreview(
      target.canonicalUrl,
      "youtube",
      "not_found",
      "YouTube video not found.",
      404,
    );
  }

  throw new Error(
    await responseError(response, data, `Failed to fetch YouTube video ${target.videoId}`),
  );
}

async function fetchGenericPreview(target: Extract<LinkPreviewTarget, { provider: "generic" }>) {
  const response = await fetch(target.canonicalUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "caulk.lol link preview cache",
    },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return unavailablePreview(
        target.canonicalUrl,
        "generic",
        "not_found",
        "Link not found.",
        404,
      );
    }
    throw new Error(`Metadata request returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    return unavailablePreview(
      target.canonicalUrl,
      "generic",
      "non_html",
      "Preview target is not HTML.",
    );
  }

  const metadata = parseHtmlMetadata(await response.text(), target.canonicalUrl);
  if (!metadata.title) {
    return unavailablePreview(
      target.canonicalUrl,
      "generic",
      "metadata_missing",
      "Preview target did not include a title.",
    );
  }

  return {
    kind: "generic",
    url: target.canonicalUrl,
    title: metadata.title,
    description: metadata.description,
    imageUrl: metadata.imageUrl,
    siteName: metadata.siteName,
  } satisfies LinkPreviewContent;
}

async function readCachedLinkPreview(
  cache: LinkPreviewCacheStore | null | undefined,
  key: string,
): Promise<CachedLinkPreview | null> {
  const cached = await cache?.get(key);
  if (!cached) return null;

  try {
    return cachedLinkPreviewSchema.parse(JSON.parse(cached));
  } catch {
    return null;
  }
}

async function writeCachedLinkPreview(
  cache: LinkPreviewCacheStore | null | undefined,
  key: string,
  value: CachedLinkPreview,
) {
  await cache?.put(key, JSON.stringify(value));
}

function isFresh(cached: CachedLinkPreview, now: Date) {
  return (
    now.getTime() - new Date(cached.cachedAt).getTime() < getMaxAgeSeconds(cached.preview) * 1000
  );
}

function getMaxAgeSeconds(preview: LinkPreviewContent) {
  if (preview.kind === "tweet") return 60 * 60 * 24;
  if (preview.kind === "youtube") return 60 * 60 * 24 * 7;
  if (preview.kind === "generic") return 60 * 60 * 24 * 7;
  return 60 * 60;
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function normalizePreviewUrl(url: URL) {
  const next = new URL(url);
  next.hash = "";
  next.hostname = next.hostname.toLowerCase();
  if (next.pathname === "/" && !next.search) return next.origin;
  return next.toString();
}

function getTweetId(url: URL): string | null {
  if (!isTweetHost(url.hostname)) return null;
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  const statusIndex = segments.findIndex(
    (segment) => segment === "status" || segment === "statuses",
  );
  if (statusIndex < 0) return null;
  const candidate = segments[statusIndex + 1];
  return candidate && isTweetId(candidate) ? candidate : null;
}

function isTweetHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com");
}

function isTweetId(value: string) {
  return tweetIdPattern.test(value);
}

function getYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

  if (hostname === "youtu.be") return validYouTubeId(segments[0]);

  if (!isYouTubeHost(hostname)) return null;
  if (url.pathname === "/watch") return validYouTubeId(url.searchParams.get("v") ?? undefined);

  const firstSegment = segments[0];
  if (firstSegment !== "shorts" && firstSegment !== "embed" && firstSegment !== "live") return null;
  return validYouTubeId(segments[1]);
}

function isYouTubeHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com";
}

function validYouTubeId(value: string | undefined): string | null {
  return value && youtubeIdPattern.test(value) ? value : null;
}

function getTweetToken(id: string) {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, "");
}

function getTweetUrl(id: string) {
  const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
  url.searchParams.set("id", id);
  url.searchParams.set("lang", "en");
  url.searchParams.set("features", tweetFeatures);
  url.searchParams.set("token", getTweetToken(id));
  return url;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEmptyObject(value: unknown) {
  return isRecord(value) && Object.keys(value).length === 0;
}

function isTweetTombstone(value: unknown) {
  return isRecord(value) && value.__typename === "TweetTombstone";
}

function unavailablePreview(
  url: string,
  provider: LinkPreviewProvider,
  reason: z.infer<typeof linkPreviewUnavailableReasonSchema>,
  message: string,
  status?: number,
): LinkPreviewContent {
  return {
    kind: "unavailable",
    provider,
    reason,
    message,
    url,
    status,
  };
}

async function responseError(response: Response, data: unknown, message: string) {
  const body = data === null ? await response.text() : JSON.stringify(data);
  return `${message}: ${response.status} ${body.slice(0, 200)}`;
}

function parseHtmlMetadata(html: string, baseUrl: string) {
  const tags = readMetaTags(html);
  return {
    title: firstText(
      tags.get("og:title"),
      tags.get("twitter:title"),
      titlePattern.exec(html)?.groups?.title,
    ),
    description: firstText(
      tags.get("og:description"),
      tags.get("twitter:description"),
      tags.get("description"),
    ),
    imageUrl: resolveMetadataUrl(
      firstText(tags.get("og:image"), tags.get("twitter:image")),
      baseUrl,
    ),
    siteName: firstText(tags.get("og:site_name"), tags.get("application-name")),
  };
}

function readMetaTags(html: string) {
  const tags = new Map<string, string>();
  for (const match of html.matchAll(metaTagPattern)) {
    const [tag] = match;
    const attributes = readAttributes(tag);
    const key = attributes.get("property") ?? attributes.get("name");
    const content = attributes.get("content");
    const text = cleanText(content);
    if (key && text) tags.set(key.toLowerCase(), text);
  }
  return tags;
}

function readAttributes(tag: string) {
  const attributes = new Map<string, string>();
  for (const match of tag.matchAll(attributePattern)) {
    const name = match.groups?.name;
    const value = match.groups?.value;
    if (name && value) attributes.set(name.toLowerCase(), value);
  }
  return attributes;
}

function firstText(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return undefined;
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : undefined;
}

function resolveMetadataUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Preview request failed.";
}

function stableHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return Math.abs(hash).toString(36);
}
