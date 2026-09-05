import assert from "node:assert/strict";
import { resolve } from "node:path";

/** Sample the real renderer: a continuous fading tail and a localized halo,
 * with an opacity ceiling even when all three shooting stars overlap. */
export async function assertMeteorAppearance(page, origin, blog, theme, repository) {
  await page.goto(`${origin}/footer.html?theme=${theme}`);
  const result = await page.evaluate(
    async ({ blog }) => {
      const { createShootingStar, renderShootingStars } = await import(
        `/@fs/${blog}/src/lib/stars.ts`
      );
      const canvas = document.createElement("canvas");
      canvas.id = "meteor-swatch";
      canvas.width = 480;
      canvas.height = 240;
      canvas.style.cssText = "position:fixed;inset:0;z-index:100;background:var(--background)";
      document.body.append(canvas);
      const ctx = canvas.getContext("2d");
      const style = getComputedStyle(document.documentElement);
      const colors = {
        core: style.getPropertyValue("--foreground"),
        glow: style.getPropertyValue("--primary"),
      };
      const dark = document.documentElement.classList.contains("dark");
      const star = { ...createShootingStar(480, 120), x: 100, angle: 0, speed: 180 };
      const frame = { elapsedMs: 800, scrollX: 0, scrollY: 0, bounds: { width: 480, height: 240 } };
      renderShootingStars(ctx, [star], dark, frame, colors);
      const at = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
      const single = {
        tail: Array.from({ length: 60 }, (_, i) => at(170 + i, 120)[3]),
        halo: at(236, 126)[3],
        outside: at(244, 170)[3],
        peak: Math.max(...ctx.getImageData(0, 0, 480, 240).data.filter((_, i) => i % 4 === 3)),
      };
      renderShootingStars(
        ctx,
        [star, structuredClone(star), structuredClone(star)],
        dark,
        { ...frame, elapsedMs: 0 },
        colors,
      );
      const overlap = Math.max(
        ...ctx.getImageData(0, 0, 480, 240).data.filter((_, i) => i % 4 === 3),
      );
      // Restore one meteor for the visual artifact.
      renderShootingStars(ctx, [star], dark, { ...frame, elapsedMs: 0 }, colors);
      return { ...single, overlap };
    },
    { blog },
  );
  assert.ok(
    result.tail.every((alpha) => alpha > 0),
    "the light trail must be continuous, without pixel gaps",
  );
  assert.ok(result.tail.at(-1) > result.tail[0], "the trail brightens toward its head");
  assert.ok(result.halo > 0 && result.halo <= 20, `halo must be present but faint: ${result.halo}`);
  assert.equal(result.outside, 0, "the glow stays local rather than washing over the page");
  assert.ok(result.peak <= 140, `the luminous head must remain translucent: ${result.peak}`);
  assert.ok(
    result.overlap <= 235,
    `overlapping stars must not become fully opaque: ${result.overlap}`,
  );
  await page
    .locator("#meteor-swatch")
    .screenshot({ path: resolve(repository, `test-results/footer/meteor-${theme}.png`) });
}
