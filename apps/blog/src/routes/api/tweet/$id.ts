import { createFileRoute } from "@tanstack/react-router";

type CacheNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const memoryCache = new Map<string, string>();

type CachedTweet =
  | { status: "hit"; data: unknown }
  | { status: "miss" }
  | { status: "invalid"; error: string };

type TweetFetchResult =
  | { status: "found"; data: unknown }
  | { status: "notFound" }
  | { status: "tombstone" };

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCacheNamespace(value: unknown): value is CacheNamespace {
  return (
    isRecord(value) &&
    typeof value.get === "function" &&
    typeof value.put === "function"
  );
}

function getTweetCache(request: Request): CacheNamespace | null {
  if (!("runtime" in request)) {
    return null;
  }

  const runtime = request.runtime;
  if (!isRecord(runtime)) {
    return null;
  }

  const cloudflare = runtime.cloudflare;
  if (!isRecord(cloudflare)) {
    return null;
  }

  const env = cloudflare.env;
  if (!isRecord(env)) {
    return null;
  }

  const cache = env.TWEET_CACHE;
  return isCacheNamespace(cache) ? cache : null;
}

async function readCachedTweet(request: Request, key: string) {
  const cache = getTweetCache(request);
  if (cache) {
    return cache.get(key);
  }

  return memoryCache.get(key) ?? null;
}

async function writeCachedTweet(request: Request, key: string, value: string) {
  const cache = getTweetCache(request);
  if (cache) {
    await cache.put(key, value);
    return;
  }

  memoryCache.set(key, value);
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function getCachedTweet(
  request: Request,
  cacheKey: string,
): Promise<CachedTweet> {
  const cached = await readCachedTweet(request, cacheKey);
  if (!cached) {
    return { status: "miss" };
  }

  try {
    const data: unknown = JSON.parse(cached);
    return { status: "hit", data };
  } catch (error) {
    return { status: "invalid", error: errorMessage(error) };
  }
}

function cachedTweetResponse(cached: CachedTweet) {
  if (cached.status !== "hit") {
    return null;
  }

  return jsonResponse(
    { data: cached.data, source: "cache" },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

function isTweetId(value: string) {
  return /^\d{1,32}$/.test(value);
}

function getTweetToken(id: string) {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, "");
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
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

function isEmptyObject(value: unknown) {
  return isRecord(value) && Object.keys(value).length === 0;
}

function isTweetTombstone(value: unknown) {
  return isRecord(value) && value.__typename === "TweetTombstone";
}

async function fetchTweetFromSyndication(
  id: string,
): Promise<TweetFetchResult> {
  const url = getTweetUrl(id);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "caulk.lol tweet embed cache",
    },
  });

  const data = await parseJsonResponse(response);

  if (response.ok) {
    if (isTweetTombstone(data)) {
      return { status: "tombstone" };
    }

    if (isEmptyObject(data) || data === null) {
      return { status: "notFound" };
    }

    return { status: "found", data };
  }

  if (response.status === 404) {
    return { status: "notFound" };
  }

  const body = data === null ? await response.text() : JSON.stringify(data);
  throw new Error(
    `Failed to fetch tweet ${id}: ${response.status} ${body.slice(0, 200)}`,
  );
}

export const Route = createFileRoute("/api/tweet/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isTweetId(params.id)) {
          return jsonResponse(
            { data: null, error: "Invalid tweet id" },
            { status: 400 },
          );
        }

        const cacheKey = `tweet:${params.id}`;
        const cached = await getCachedTweet(request, cacheKey);

        try {
          const result = await fetchTweetFromSyndication(params.id);

          if (result.status === "found") {
            const serialized = JSON.stringify(result.data);
            await writeCachedTweet(request, cacheKey, serialized);
            return jsonResponse(
              { data: result.data, source: "live" },
              {
                headers: {
                  "Cache-Control": "public, max-age=300, s-maxage=300",
                },
              },
            );
          }

          const staleResponse = cachedTweetResponse(cached);
          if (staleResponse) {
            return staleResponse;
          }

          return jsonResponse(
            {
              data: null,
              error:
                result.status === "tombstone"
                  ? "Tweet unavailable"
                  : "Tweet not found",
            },
            { status: 404 },
          );
        } catch (error) {
          const staleResponse = cachedTweetResponse(cached);
          if (staleResponse) {
            return staleResponse;
          }

          return jsonResponse(
            { data: null, error: errorMessage(error) },
            { status: 502 },
          );
        }
      },
    },
  },
});
