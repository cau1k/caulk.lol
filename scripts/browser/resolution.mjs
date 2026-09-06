import assert from "node:assert/strict";
import { expect } from "playwright/test";

/** Exercise real mask downloads, including the reserved space while decoding. */
export async function assertFooterResolution(page, origin, asset) {
  const requests = [];
  let release;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/\/media\/roman(?:@2x)?\.webp$/, async (route) => {
    requests.push(new URL(route.request().url()).pathname);
    await waiting;
    await route.continue();
  });
  await page.goto(`${origin}/footer.html?theme=dark`);
  await page.getByRole("contentinfo").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const artwork = page.locator('footer > div[aria-hidden="true"]');
  const reserved = await artwork.boundingBox();
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  assert.deepEqual(requests, [], "neither resolution should load before the footer approaches");

  await artwork.scrollIntoViewIfNeeded();
  await expect.poll(() => requests.length).toBe(1);
  assert.deepEqual(requests, [`/media/${asset}`], "download only the selected resolution");
  const before = await artwork.boundingBox();
  assert.equal(before.width, reserved.width);
  assert.equal(before.height, reserved.height, "reserve the complete frame before loading");
  release();
  const decoded = await artwork.locator('[data-scene-layer="ink"]').evaluate(async (element) => {
    const image = new Image();
    image.src = getComputedStyle(element).maskImage.slice(5, -2);
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  assert.deepEqual(decoded, asset.includes("@2x") ? [3344, 1882] : [1672, 941]);
  assert.deepEqual(await artwork.boundingBox(), before, "loading must not shift the artwork");
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), documentHeight);
  // Routing disables Chromium's cache; the explicit Image.decode probe can
  // request the same URL again. It must never fetch the unused resolution.
  assert.deepEqual([...new Set(requests)], [`/media/${asset}`]);
}
