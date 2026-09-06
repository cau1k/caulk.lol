// Rebuild the scenery's SVG occlusion mask after changing roman.webp.
// Requires ImageMagick 7 locally; browsers only download the generated SVG.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../public/media/roman.webp", import.meta.url);
const [width, height] = execFileSync(
  "magick",
  ["identify", "-format", "%w %h", fileURLToPath(source)],
  { encoding: "utf8" },
)
  .split(" ")
  .map(Number);
const pixels = execFileSync(
  "magick",
  [
    fileURLToPath(source),
    "-colorspace",
    "Gray",
    "-threshold",
    "12.5%",
    "-morphology",
    "Close",
    "Disk:3",
    "-depth",
    "8",
    "gray:-",
  ],
  { maxBuffer: width * height + 1024 },
);
if (pixels.length !== width * height) throw new Error("Unexpected grayscale pixel count");

// The landscape is a solid foreground silhouette. Only the selected openings
// between the colonnade's columns may reveal the animated sky behind it.
const engraving = execFileSync(
  "magick",
  [fileURLToPath(source), "-colorspace", "Gray", "-depth", "8", "gray:-"],
  { maxBuffer: width * height + 1024 },
);
const mask = new Uint8Array(width * height);
for (let x = 0; x < width; x++) {
  let skyline = 0;
  while (skyline < height && engraving[skyline * width + x] < 32) skyline++;
  for (let y = skyline; y < height; y++) mask[y * width + x] = 255;
}
carveColonnade(pixels, mask, width);
const paths = traceContours(mask, width, height);
const hash = createHash("sha256")
  .update(await readFile(source))
  .digest("hex");
const generatorHash = createHash("sha256")
  .update(await readFile(new URL(import.meta.url)))
  .digest("hex");
await writeFile(
  new URL("../public/media/roman.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><metadata>roman.webp sha256:${hash}; footer.mjs sha256:${generatorHash}</metadata><path fill="white" fill-rule="evenodd" d="${paths.join("")}"/></svg>\n`,
);
console.log(
  `Generated Roman occlusion mask with ${paths.length} contours from ${width} × ${height} source pixels.`,
);

function carveColonnade(pixels, mask, width) {
  // Source-pixel seeds identify the seven main column openings in roman.webp.
  // Tracing each enclosed region follows its stone edges without opening dark
  // texture in the foliage, stairs, rocks, or the buildings below the colonnade.
  const openings = [
    [1095, 330],
    [1128, 330],
    [1170, 320],
    [1208, 330],
    [1255, 310],
    [1310, 280],
    [1370, 265],
  ];
  const seen = new Uint8Array(pixels.length);
  for (const [seedX, seedY] of openings) {
    const start = seedY * width + seedX;
    if (pixels[start]) throw new Error(`Column opening at ${seedX},${seedY} is no longer empty`);
    const region = [start];
    seen[start] = 1;
    for (let i = 0; i < region.length; i++) {
      const index = region[i];
      const x = index % width;
      const y = Math.floor(index / width);
      // Fail on changed artwork instead of accidentally carving the entire sky
      // component through the foreground if a column boundary stops enclosing it.
      if (x < 1010 || x > 1455 || y < 235 || y > 450) {
        throw new Error(`Column opening at ${seedX},${seedY} escapes the colonnade`);
      }
      mask[index] = 0;
      for (const next of [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        index - width,
        index + width,
      ]) {
        if (next < 0 || next >= pixels.length || pixels[next] || seen[next]) continue;
        seen[next] = 1;
        region.push(next);
      }
    }
  }
}

/** Trace pixel boundaries into SVG contours. Even-odd fill preserves holes;
 * subpixel simplification keeps the skyline and column edges compact. */
function traceContours(pixels, width, height) {
  const stride = width + 1;
  const edges = new Map();
  const add = (from, to) => {
    if (!edges.has(from)) edges.set(from, []);
    edges.get(from).push(to);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (!pixels[index]) continue;
      const corner = y * stride + x;
      if (y === 0 || !pixels[index - width]) add(corner, corner + 1);
      if (x === width - 1 || !pixels[index + 1]) add(corner + 1, corner + stride + 1);
      if (y === height - 1 || !pixels[index + width]) add(corner + stride + 1, corner + stride);
      if (x === 0 || !pixels[index - 1]) add(corner + stride, corner);
    }
  }
  const paths = [];
  const direction = (delta) => [1, stride, -1, -stride].indexOf(delta);
  while (edges.size) {
    const start = edges.keys().next().value;
    const points = [];
    let current = start;
    let heading = 0;
    do {
      points.push([current % stride, Math.floor(current / stride)]);
      const choices = edges.get(current);
      // At a diagonal pixel junction, turn right to keep the solid region on
      // the same side of the contour rather than crossing into another loop.
      choices.sort(
        (a, b) =>
          ((direction(a - current) - heading + 3) % 4) -
          ((direction(b - current) - heading + 3) % 4),
      );
      const next = choices.shift();
      if (!choices.length) edges.delete(current);
      heading = direction(next - current);
      current = next;
    } while (current !== start);
    const middle = Math.floor(points.length / 2);
    const simplified = [
      ...simplify(points.slice(0, middle + 1)),
      ...simplify([...points.slice(middle), points[0]]).slice(1, -1),
    ];
    if (simplified.length >= 3) {
      // Relative offsets compress the detailed skyline much better than
      // repeating four-digit document coordinates for every small edge.
      paths.push(
        `M${simplified[0].join(",")}${simplified
          .slice(1)
          .map(([x, y], i) => {
            const dx = x - simplified[i][0];
            const dy = y - simplified[i][1];
            if (dx === 0) return `v${dy}`;
            if (dy === 0) return `h${dx}`;
            return `l${dx},${dy}`;
          })
          .join("")}Z`,
      );
    }
  }
  return paths;
}

// Douglas–Peucker simplification, limited to 0.75 source pixels of deviation.
function simplify(points) {
  const [ax, ay] = points[0];
  const [bx, by] = points.at(-1);
  const dx = bx - ax;
  const dy = by - ay;
  let furthest = 0;
  let maximum = 0.75 ** 2;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const distance = (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
    if (distance <= maximum) continue;
    maximum = distance;
    furthest = i;
  }
  if (!furthest) return [points[0], points.at(-1)];
  return [
    ...simplify(points.slice(0, furthest + 1)).slice(0, -1),
    ...simplify(points.slice(furthest)),
  ];
}
