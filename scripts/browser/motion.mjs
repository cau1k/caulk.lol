import assert from "node:assert/strict";
import { expect } from "playwright/test";

/** Exercise the actual animation component with controlled time, not a parallel
 * simulation or production-only test hooks. Observe the meteor body's pixels. */
export async function assertShootingStarMotion(page, origin) {
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto(`${origin}/footer.html`);
  const meteor = page.locator("canvas").nth(1);
  await expect
    .poll(() =>
      meteor.evaluate(
        (canvas) => canvas.width > 0 && canvas.width === document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  // Let startup finish, then skip to a new spawn and stop the clock. Any earlier
  // meteor has passed the document; the next one starts at page y=0.
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page.clock.runFor(100);
  assert.ok(await headBounds(meteor), "a shooting star starts in view");

  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  await page.clock.runFor(16);
  assert.equal(await headBounds(meteor), null, "scrolling past the star must move it out of view");
  await page.clock.runFor(1000);
  assert.equal(await headBounds(meteor), null, "the same star is still above the camera");
  await page.clock.fastForward(2000);
  const returned = await headBounds(meteor);
  assert.ok(
    returned && returned.y > 100 && returned.y < 180,
    `the offscreen star must continue until it reaches the scrolled view: ${JSON.stringify(returned)}`,
  );

  await page.getByRole("button", { name: "Pause stars" }).evaluate((button) => button.click());
  await expect(page.getByRole("button", { name: "Resume stars" })).toBeVisible();
  const paused = await headBounds(meteor);
  await page.clock.fastForward(2000);
  assert.deepEqual(await headBounds(meteor), paused, "explicit pauses freeze the trajectory");
  await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
  await expect.poll(async () => (await headBounds(meteor))?.y).toBe(paused.y - 50);
  await page.getByRole("button", { name: "Resume stars" }).evaluate((button) => button.click());
  await expect(page.getByRole("button", { name: "Pause stars" })).toBeVisible();
  await page.clock.runFor(32);
  const resumed = await headBounds(meteor);
  assert.ok(
    resumed.y >= paused.y - 50 && resumed.y <= paused.y - 40,
    "resuming must not jump ahead by the intentionally paused time",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(32);
  const reduced = await meteor.evaluate((canvas) => canvas.toDataURL());
  await page.clock.fastForward(2000);
  assert.equal(
    await meteor.evaluate((canvas) => canvas.toDataURL()),
    reduced,
    "reduced-motion preference must pause the animation",
  );
}

function headBounds(meteor) {
  return meteor.evaluate((canvas) => {
    const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    let x = Infinity;
    let y = Infinity;
    for (let row = 0; row < canvas.height; row++) {
      for (let column = 0; column < canvas.width; column++) {
        // Body alpha exceeds the separate trail's maximum alpha.
        if (data[(row * canvas.width + column) * 4 + 3] < 95) continue;
        x = Math.min(x, column);
        y = Math.min(y, row);
      }
    }
    return Number.isFinite(y) ? { x, y } : null;
  });
}
