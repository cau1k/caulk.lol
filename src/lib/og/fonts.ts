import type { Font } from "@takumi-rs/wasm";

type FontConfig = {
  name: string;
  url: string;
  weight: number;
  style: "normal" | "italic";
};

const fontConfigs: FontConfig[] = [
  {
    name: "CMU Serif",
    url: "/fonts/cmu-serif/cmunrm-webfont.ttf",
    weight: 400,
    style: "normal",
  },
  {
    name: "CMU Serif",
    url: "/fonts/cmu-serif/cmunbx-webfont.ttf",
    weight: 700,
    style: "normal",
  },
  {
    name: "CMU Sans Serif",
    url: "/fonts/cmu-sans/cmunss-webfont.ttf",
    weight: 400,
    style: "normal",
  },
  {
    name: "CMU Sans Serif",
    url: "/fonts/cmu-sans/cmunsx-webfont.ttf",
    weight: 700,
    style: "normal",
  },
];

async function loadFont(url: URL): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }

  return response.arrayBuffer();
}

async function buildFonts(requestUrl: URL): Promise<Font[]> {
  const fonts = await Promise.all(
    fontConfigs.map(async (config) => {
      const data = await loadFont(new URL(config.url, requestUrl));
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

let cachedFonts: Promise<Font[]> | null = null;

export function getOgFonts(requestUrl: URL): Promise<Font[]> {
  if (!cachedFonts) {
    cachedFonts = buildFonts(requestUrl).catch((error) => {
      cachedFonts = null;
      throw error;
    });
  }

  return cachedFonts;
}
