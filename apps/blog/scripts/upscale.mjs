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
    "-depth",
    "8",
    "-strip",
    "-quality",
    "92",
    fileURLToPath(
      new URL(`../public/media/roman${scale === 2 ? "@2x" : ""}.webp`, import.meta.url),
    ),
  ]);
}

// Keep the existing source coordinate system and all seven column openings.
await import("./footer.mjs");
