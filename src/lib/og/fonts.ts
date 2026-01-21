import type { Font } from "@takumi-rs/wasm";

type FontConfig = {
  name: string;
  path: string;
  weight: number;
  style: "normal" | "italic";
};

type FetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type AssetsFetcher = {
  fetch: FetchFunction;
};

const fontConfigs: FontConfig[] = [
  {
    name: "CMU Serif",
    path: "/fonts/cmu-serif/cmunrm-webfont.ttf",
    weight: 400,
    style: "normal",
  },
  {
    name: "CMU Serif",
    path: "/fonts/cmu-serif/cmunbx-webfont.ttf",
    weight: 700,
    style: "normal",
  },
  {
    name: "CMU Sans Serif",
    path: "/fonts/cmu-sans/cmunss-webfont.ttf",
    weight: 400,
    style: "normal",
  },
  {
    name: "CMU Sans Serif",
    path: "/fonts/cmu-sans/cmunsx-webfont.ttf",
    weight: 700,
    style: "normal",
  },
];


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssetsFetcher(value: unknown): value is AssetsFetcher {
  return isRecord(value) && typeof value.fetch === "function";
}

function getAssetsFetch(request: Request): FetchFunction | null {
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

  const assets = env.ASSETS;
  if (!isAssetsFetcher(assets)) {
    return null;
  }

  return assets.fetch;
}

async function loadFont(url: URL, fetcher: FetchFunction): Promise<ArrayBuffer> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }

  return response.arrayBuffer();
}

async function buildFonts(request: Request): Promise<Font[]> {
  const requestUrl = new URL(request.url);
  const assetsFetch = getAssetsFetch(request);
  const fetcher = assetsFetch ?? fetch;
  const fonts = await Promise.all(
    fontConfigs.map(async (config) => {
      const data = await loadFont(new URL(config.path, requestUrl), fetcher);
      return {
        name: config.name,
        data,
        weight: config.weight,
        style: config.style,
      } satisfies Font;
    }),
  );

  return fonts;
}

const fontsCache = new Map<string, Promise<Font[]>>();

export function getOgFonts(request: Request): Promise<Font[]> {
  const requestUrl = new URL(request.url);
  const cacheKey = requestUrl.origin;
  const cached = fontsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = buildFonts(request).catch((error) => {
    fontsCache.delete(cacheKey);
    throw error;
  });
  fontsCache.set(cacheKey, pending);
  return pending;
}
