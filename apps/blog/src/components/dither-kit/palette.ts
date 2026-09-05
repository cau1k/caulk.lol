export type Rgb = [number, number, number];

export type DitherColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "grey"
  | "primary"
  | "primaryMuted";

export type Seed = { fill: Rgb; line: Rgb; star: Rgb };

const SERVER_SEED: Seed = {
  fill: [0, 0, 0],
  line: [0, 0, 0],
  star: [0, 0, 0],
};

// Each seed: the area-fill hue, the bright series line, and the star sparkle.
const STATIC_PALETTE: Record<DitherColor, Seed> = {
  green: { fill: [40, 210, 110], line: [150, 255, 180], star: [200, 255, 220] },
  blue: { fill: [53, 143, 243], line: [150, 200, 255], star: [205, 228, 255] },
  purple: {
    fill: [150, 110, 255],
    line: [200, 175, 255],
    star: [225, 210, 255],
  },
  pink: { fill: [240, 90, 190], line: [255, 170, 220], star: [255, 205, 235] },
  orange: {
    fill: [255, 150, 50],
    line: [255, 195, 130],
    star: [255, 220, 175],
  },
  red: { fill: [240, 70, 70], line: [255, 150, 140], star: [255, 195, 185] },
  primary: SERVER_SEED,
  primaryMuted: SERVER_SEED,
  // No-data: a muted grey so empty metrics read as "nothing here".
  grey: { fill: [92, 92, 100], line: [140, 140, 150], star: [165, 165, 175] },
};

const cssSeedCache = new Map<string, Seed>();

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`;

export function seedOfColor(color: DitherColor): Seed {
  if (color === "primary") return primarySeed(1);
  if (color === "primaryMuted") return primarySeed(0.62);
  return STATIC_PALETTE[color];
}

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in STATIC_PALETTE;

function primarySeed(alpha: number): Seed {
  if (typeof document === "undefined") return SERVER_SEED;

  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue("--primary").trim();
  const background = styles.getPropertyValue("--background").trim();
  if (!primary) throw new Error("Dither primary palette requires --primary.");
  if (!background)
    throw new Error("Dither primary palette requires --background.");

  const cacheKey = `${primary}|${background}|${alpha}`;
  const cached = cssSeedCache.get(cacheKey);
  if (cached) return cached;

  const mixed = mix(
    sampleCssColor(primary),
    sampleCssColor(background),
    1 - alpha,
  );
  const seed = { fill: mixed, line: mixed, star: mixed };
  cssSeedCache.set(cacheKey, seed);
  return seed;
}

function sampleCssColor(value: string): Rgb {
  const context = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true,
  });
  if (!context)
    throw new Error("Dither palette could not create a canvas context.");

  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  if (a === 0)
    throw new Error(`Dither palette could not sample CSS color ${value}.`);
  return [r, g, b];
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    clampChannel(a[0] * (1 - amount) + b[0] * amount),
    clampChannel(a[1] * (1 - amount) + b[1] * amount),
    clampChannel(a[2] * (1 - amount) + b[2] * amount),
  ];
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
