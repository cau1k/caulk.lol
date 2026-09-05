import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const blog = new URL("../", import.meta.url);
const output = new URL("src/generated/diagrams/", blog);
const digest = (data) => createHash("sha256").update(data).digest("hex");

test("every editable diagram has an intact SVG generated from the current source and exporter", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", output), "utf8"));
  const { fingerprint } = await import("../scripts/diagrams/files.mjs");
  assert.equal(manifest.generator, await fingerprint(), "Run pnpm --filter blog diagrams:generate");
  const sources = (await readdir(new URL("public/", blog), { recursive: true }))
    .filter((file) => file.endsWith(".excalidraw"))
    .map((file) => `/${file}`)
    .sort();
  assert.deepEqual(manifest.scenes.map((scene) => scene.source).sort(), sources);

  for (const scene of manifest.scenes) {
    assert.equal(
      scene.sourceHash,
      digest(await readFile(new URL(`public${scene.source}`, blog))),
      `${scene.source} changed; run pnpm --filter blog diagrams:generate`,
    );
    assert.equal(scene.svgHash, digest(await readFile(new URL(scene.file, output))));
  }
});

test("the generated diagram retains readable text, theme colors, and vector geometry", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", output), "utf8"));
  for (const scene of manifest.scenes) {
    const source = JSON.parse(await readFile(new URL(`public${scene.source}`, blog), "utf8"));
    const svg = await readFile(new URL(scene.file, output), "utf8");
    assert.match(svg, /<svg[^>]+viewBox="[^"]+"/);
    assert.match(svg, /<path\s/);
    assert.match(svg, /var\(--font-serif\)/);
    assert.match(svg, /var\(--foreground\)/);
    assert.doesNotMatch(svg, /@font-face|https?:\/\/[^"\s]*\.woff/);
    for (const element of source.elements.filter(
      (item) => item.type === "text" && !item.isDeleted,
    )) {
      const escaped = element.text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      assert.ok(svg.includes(`>${escaped}</text>`), `Missing diagram label: ${element.text}`);
    }
  }
});
