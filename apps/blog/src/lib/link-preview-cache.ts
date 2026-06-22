import type { LinkPreviewCacheStore } from "@caulk.lol/api/link-preview";
import { getAppEnv } from "@/lib/worker-env";

const memoryCache = new Map<string, string>();

export function getLinkPreviewCache(request?: Request): LinkPreviewCacheStore {
  const env = getAppEnv(request);
  return env.LINK_PREVIEW_CACHE ?? env.TWEET_CACHE ?? memoryCacheStore;
}

const memoryCacheStore: LinkPreviewCacheStore = {
  async get(key) {
    return memoryCache.get(key) ?? null;
  },
  async put(key, value) {
    memoryCache.set(key, value);
  },
};
