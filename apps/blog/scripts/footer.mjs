// Rebuild the scenery's solid SVG silhouette after changing roman.webp.
// Requires ImageMagick 7 locally; browsers only download the generated SVG.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../public/media/roman.webp", import.meta.url);
const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", fileURLToPath(source)], { encoding: "utf8" }).split(" ").map(Number);
const pixels = execFileSync("magick", [fileURLToPath(source), "-colorspace", "Gray", "-depth", "8", "gray:-"], { maxBuffer: width * height + 1024 });
if (pixels.length !== width * height) throw new Error("Unexpected grayscale pixel count");

// Fill everything below the first ink in each column. Unlike the engraving's
// luminance mask, this has no pinholes between hatch marks. The threshold rejects
// faint WebP ringing in the empty sky, retaining the actual tree/roof contours.
const skyline = Array.from({ length: width }, (_, x) => {
  for (let y = 0; y < height; y++) {
    if (pixels[y * width + x] >= 32) return y;
  }
  return height;
});
const points = skyline.flatMap((y, x) => {
  if (x > 0 && x < width - 1 && y - skyline[x - 1] === skyline[x + 1] - y) return [];
  return [`${x},${y}`];
});
const hash = createHash("sha256").update(await readFile(source)).digest("hex");
await writeFile(new URL("../public/media/roman.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><metadata>roman.webp sha256:${hash}</metadata><path fill="white" d="M${points.join("L")}L${width},${skyline.at(-1)}V${height}H0Z"/></svg>\n`);
console.log(`Generated Roman occlusion silhouette from ${width} × ${height} source pixels.`);
