import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "playwright/test";

/** Inspect paint, not just CSS support: WebKit accepts luminance masks but can
 * render their entire rectangle as opaque at particular sizes/densities.
 * https://bugs.webkit.org/show_bug.cgi?id=282530 */
export async function assertFooterMask(page, origin, repository, name, theme) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/footer.html?short&theme=${theme}`);
  await page.evaluate(() => document.fonts.ready);
  const artwork = page.locator('footer > div[aria-hidden="true"]');
  await artwork.scrollIntoViewIfNeeded();
  await expect(artwork).toBeVisible();
  await artwork.locator("[data-scene-layer]").evaluateAll((layers) =>
    Promise.all(
      layers.map(async (layer) => {
        const image = new Image();
        image.src = getComputedStyle(layer).maskImage.slice(5, -2);
        await image.decode();
      }),
    ),
  );
  // Remove random stars from the paint measurement, leaving real theme colors,
  // both mask layers and the actual compositing/opacity path unchanged.
  await page.locator("canvas").evaluateAll((canvases) => {
    canvases.forEach((canvas) => {
      canvas.style.visibility = "hidden";
    });
  });
  const screenshot = await artwork.screenshot({
    path: resolve(repository, `test-results/footer/mask-${name}-${theme}.png`),
  });
  const paint = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const at = (x, y) => {
      const index =
        (Math.floor(y * canvas.height) * canvas.width + Math.floor(x * canvas.width)) * 4;
      return Array.from(data.slice(index, index + 3));
    };
    const sky = at(0.5, 0.05);
    // Engraving must have both ink and negative space. This catches an invisible
    // image as well as a solid green fill, without brittle golden screenshots.
    let ink = 0;
    let empty = 0;
    for (let y = 0.25; y < 0.45; y += 0.002) {
      for (let x = 0.62; x < 0.86; x += 0.002) {
        const pixel = at(x, y);
        if (pixel[1] - pixel[0] > 15) ink++;
        if (Math.max(...pixel) - Math.min(...pixel) < 10) empty++;
      }
    }
    return { sky, ink, empty };
  }, screenshot.toString("base64"));
  assert.ok(
    Math.max(...paint.sky) - Math.min(...paint.sky) < 10,
    `sky must show the neutral page background, not a green rectangle: ${paint.sky}`,
  );
  assert.ok(paint.ink > 100, `the colonnade must contain visible green linework: ${paint.ink}`);
  assert.ok(paint.empty > 100, `column openings must contain negative space: ${paint.empty}`);
  assert.deepEqual(errors, []);
}
