import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the footer silhouette is generated from the current engraving", async () => {
  const source = await readFile(new URL("../public/media/roman.webp", import.meta.url));
  const silhouette = await readFile(new URL("../public/media/roman.svg", import.meta.url), "utf8");
  assert.ok(
    silhouette.includes(`sha256:${createHash("sha256").update(source).digest("hex")}`),
    "regenerate the silhouette with node apps/blog/scripts/footer.mjs after changing the artwork",
  );
  const generator = await readFile(new URL("../scripts/footer.mjs", import.meta.url));
  assert.ok(
    silhouette.includes(
      `footer.mjs sha256:${createHash("sha256").update(generator).digest("hex")}`,
    ),
    "regenerate the mask after changing its contour generator",
  );
});
