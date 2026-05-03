import { createFileRoute } from "@tanstack/react-router";
import { fetchTweet } from "react-tweet/api";

type CacheNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const memoryCache = new Map<string, string>();

type CachedTweet =
  | { status: "hit"; data: unknown }
  | { status: "miss" }
  | { status: "invalid"; error: string };

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
          const result = await fetchTweet(params.id);

          if (result.data) {
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
              error: result.tombstone ? "Tweet unavailable" : "Tweet not found",
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
