// Rebuild both display sizes from the lossless monochrome master, never from
// an already-compressed WebP. Requires ImageMagick 7 locally, no runtime deps.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

for (const scale of [1, 2]) {
  execFileSync("magick", [
    fileURLToPath(new URL("./assets/roman.png", import.meta.url)),
    "-filter",
    "Lanczos",
    "-resize",
    `${scale * 100}%`,
    // A small, scale-relative radius sharpens ink edges without broad halos.
    "-unsharp",
    `0x${scale * 0.4}+1.0+0.015`,
    // Bake brightness into alpha so browsers need no luminance conversion.
    // WebKit can paint opaque luminance masks as solid fills at large sizes:
    // https://bugs.webkit.org/show_bug.cgi?id=282530
    "-alpha",
    "Copy",
    "-channel",
    "RGB",
    "-evaluate",
    "Set",
    "100%",
    "+channel",
    // 64 opacity levels reduce transfer size; at most 2/255 error, without
    // moving or blurring any edge. Transparent sky stays exactly transparent.
    "-channel",
    "A",
    "-posterize",
    "64",
    "+channel",
    "-depth",
    "8",
    "-strip",
    "-quality",
    "92",
    "-define",
    "webp:alpha-quality=100",
    fileURLToPath(
      new URL(`../public/media/roman${scale === 2 ? "@2x" : ""}.webp`, import.meta.url),
    ),
  ]);
}

// Keep the existing source coordinate system and all seven column openings.
await import("./footer.mjs");
