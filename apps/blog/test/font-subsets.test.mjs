import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const blog = new URL("../", import.meta.url);
const repo = new URL("../../../", import.meta.url);
const css = readFileSync(new URL("src/styles/fonts.css", blog), "utf8");
const manifest = JSON.parse(
  readFileSync(new URL("scripts/fonts/cmu-latin-subsets.json", blog), "utf8"),
);
const faces = [
  ["cmu-serif", "cmunrm", "CMU Serif", "400", "normal"],
  ["cmu-serif", "cmunti", "CMU Serif", "400", "italic"],
  ["cmu-serif", "cmunbx", "CMU Serif", "700", "normal"],
  ["cmu-serif", "cmunbi", "CMU Serif", "700", "italic"],
  ["cmu-sans", "cmunss", "CMU Sans Serif", "400", "normal"],
  ["cmu-sans", "cmunsi", "CMU Sans Serif", "400", "italic"],
  ["cmu-sans", "cmunsx", "CMU Sans Serif", "700", "normal"],
  ["cmu-sans", "cmunso", "CMU Sans Serif", "700", "italic"],
];

const coreRange = "U+0020-007E, U+2010-2014, U+2018-201A, U+201C-201E, U+2022, U+2026";
const extRange = "U+00A0-00FF, U+2039-203A, U+205F";

test("CMU webfonts are split into core and extension unicode ranges", () => {
  assert.doesNotMatch(css, /-webfont-latin\.woff2/);

  for (const [directory, stem, family, weight, style] of faces) {
    const core = `/fonts/${directory}/${stem}-webfont-latin-core.woff2`;
    const ext = `/fonts/${directory}/${stem}-webfont-latin-ext.woff2`;

    assert.ok(existsSync(new URL(`public${core}`, blog)), `${core} missing`);
    assert.ok(existsSync(new URL(`public${ext}`, blog)), `${ext} missing`);
    assert.match(css, facePattern({ family, weight, style, url: core, unicodeRange: coreRange }));
    assert.match(css, facePattern({ family, weight, style, url: ext, unicodeRange: extRange }));
  }
});

test("CMU subset manifest matches checked-in generator and font assets", () => {
  assert.equal(manifest.generator_sha256, digest(new URL("scripts/fonts/woff2.py", blog)));
  assert.equal(manifest.families.length, faces.length);

  for (const family of manifest.families) {
    assert.equal(family.full.cmap_entries, family.core.cmap_entries + family.ext.cmap_entries);
    assert.equal(family.full.glyphs, 203);
    assert.equal(family.core.glyphs, 113);
    assert.equal(family.core.cmap_entries, 108);
    assert.equal(family.ext.glyphs, 94);
    assert.equal(family.ext.cmap_entries, 90);

    for (const record of [family.full, family.core, family.ext]) {
      assert.equal(record.source_sha256, digest(new URL(record.source, repo)));
      assert.equal(record.output_sha256, digest(new URL(record.output, repo)));
    }
  }
});

function facePattern({ family, weight, style, url, unicodeRange }) {
  return new RegExp(
    String.raw`@font-face \{[\s\S]*?font-family: "${escapeRegex(family)}";[\s\S]*?src: url\("${escapeRegex(url)}"\) format\("woff2"\);[\s\S]*?font-weight: ${weight};[\s\S]*?font-style: ${style};[\s\S]*?unicode-range: ${escapeRegex(unicodeRange)};[\s\S]*?\}`,
  );
}

function digest(url) {
  return createHash("sha256").update(readFileSync(url)).digest("hex");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
