import assert from "node:assert/strict";
import test from "node:test";
import { getOgFonts } from "../src/lib/og/fonts.ts";

test("OG fonts use the asset binding without a legacy request.runtime", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("OG fonts must not use a public network fetch");
  });
  const paths = [];
  const fonts = await getOgFonts(new Request("https://og-test.invalid/image.webp"), async (url) => {
    paths.push(url.pathname);
    return new Response(new Uint8Array([1, 2, 3]));
  });

  assert.equal(fonts.length, 4);
  assert.deepEqual(paths, [
    "/fonts/cmu-serif/cmunrm-webfont.ttf",
    "/fonts/cmu-serif/cmunbx-webfont.ttf",
    "/fonts/cmu-sans/cmunss-webfont.ttf",
    "/fonts/cmu-sans/cmunsx-webfont.ttf",
  ]);
  assert.ok(fonts.every((font) => font.data.byteLength === 3));
});
