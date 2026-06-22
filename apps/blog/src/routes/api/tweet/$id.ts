import { type LinkPreviewCacheStore, resolveTweetEmbed } from "@caulk.lol/api/link-preview";
import { createFileRoute } from "@tanstack/react-router";

const memoryCache = new Map<string, string>();
const tweetIdPattern = /^\d{1,32}$/;

type CacheNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export const Route = createFileRoute("/api/tweet/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!tweetIdPattern.test(params.id)) {
          return jsonResponse({ data: null, error: "Invalid tweet id" }, { status: 400 });
        }

        try {
          const result = await resolveTweetEmbed(params.id, {
            cache: getLinkPreviewCache(request),
          });

          return jsonResponse(result, {
            headers: {
              "Cache-Control":
                result.source === "live"
                  ? "public, max-age=300, s-maxage=300"
                  : "public, max-age=3600, s-maxage=86400",
            },
          });
        } catch (error) {
          return jsonResponse({ data: null, error: errorMessage(error) }, { status: 502 });
        }
      },
    },
  },
});

function getLinkPreviewCache(request: Request): LinkPreviewCacheStore {
  const env = getCloudflareEnv(request);
  return (
    readCacheBinding(env, "LINK_PREVIEW_CACHE") ??
    readCacheBinding(env, "TWEET_CACHE") ??
    memoryCacheStore
  );
}

const memoryCacheStore: LinkPreviewCacheStore = {
  async get(key) {
    return memoryCache.get(key) ?? null;
  },
  async put(key, value) {
    memoryCache.set(key, value);
  },
};

function getCloudflareEnv(request: Request): Record<string, unknown> | undefined {
  if (!("runtime" in request) || !isRecord(request.runtime)) return undefined;
  const cloudflare = request.runtime.cloudflare;
  if (!isRecord(cloudflare)) return undefined;
  const env = cloudflare.env;
  return isRecord(env) ? env : undefined;
}

function readCacheBinding(
  env: Record<string, unknown> | undefined,
  name: string,
): CacheNamespace | undefined {
  if (!env) return undefined;
  const value = env[name];
  return isCacheNamespace(value) ? value : undefined;
}

function isCacheNamespace(value: unknown): value is CacheNamespace {
  return isRecord(value) && typeof value.get === "function" && typeof value.put === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
