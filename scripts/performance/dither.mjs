import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { expect } from "playwright/test";

// Interaction fixture only. Never use request interception in timing runs:
// Playwright routing disables the browser cache.
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROMIUM });
const output = "test-results/performance/dither";
await mkdir(output, { recursive: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "dark",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
try {
  await page.route("**/api/analytics", (route) =>
    route.fulfill({
      json: {
        generatedAt: "2026-09-05T05:00:00Z",
        source: "demo",
        rangeHours: 24,
        bucketMinutes: 15,
        totals: { requests: 100, errors: 0, p95Ms: 180, avgMs: 50 },
        points: [30, 80, 50, 90].map((p50Ms, index) => ({
          timestamp: `2026-09-05T0${index + 1}:00:00Z`,
          requests: 25,
          errors: 0,
          p50Ms,
          p95Ms: p50Ms * 2,
          avgMs: p50Ms + 10,
        })),
        network: {
          nodes: ["/", "/posts", "/posts/:slug"].map((route) => ({
            route,
            requests: 25,
            p95Ms: 180,
          })),
          edges: [
            { source: "/", target: "/posts", requests: 20 },
            { source: "/posts", target: "/posts/:slug", requests: 15 },
          ],
        },
      },
    }),
  );
  await page.goto("http://127.0.0.1:4317/analytics");
  const chart = page.locator("main canvas").first();
  await chart.waitFor();
  await page.waitForTimeout(500);
  const dark = await greenPixels(chart);
  assert.ok(dark > 0, "Dark Dither canvas has no green pixels");
  await page.locator("#theme-toggle-input").click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
  await page.waitForTimeout(500);
  const light = await greenPixels(chart);
  assert.ok(light > 0, "Light Dither canvas has no green pixels");
  assert.notEqual(light, dark, "Canvas did not repaint for the new primary");
  await page
    .getByRole("img", { name: "Chart", exact: true })
    .hover({ position: { x: 150, y: 100 } });
  const tooltip = page.locator("main .pointer-events-none").filter({ hasText: "average" });
  await expect(tooltip).toBeVisible();
  for (const label of ["p95", "p50", "average", "requests"])
    await expect(tooltip.getByText(label, { exact: true })).toBeVisible();
  const graph = page.getByRole("img", { name: "Route network graph", exact: true });
  await graph.scrollIntoViewIfNeeded();
  const transform = graph.locator(":scope > g").first();
  const initial = await transform.getAttribute("transform");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(transform).not.toHaveAttribute("transform", initial);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(transform).toHaveAttribute("transform", initial);
  await graph.hover();
  await page.mouse.wheel(0, -100);
  await expect(transform).not.toHaveAttribute("transform", initial);
  const afterZoom = await transform.getAttribute("transform");
  const box = await graph.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 150);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 180, { steps: 4 });
  await page.mouse.up();
  await expect(transform).not.toHaveAttribute("transform", afterZoom);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await graph.getByRole("button").first().focus();
  await expect(graph.locator("foreignObject")).toBeVisible();
  await page.screenshot({ path: `${output}/light.png`, fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("#theme-toggle-input").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/dark.png`, fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "Analytics overflows mobile body",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Dither themes, tooltip, graph zoom/wheel/pan/reset/focus, and mobile containment passed.",
  );
} catch (error) {
  console.error(errors);
  console.error(await page.locator("body").innerText());
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
}

async function greenPixels(canvas) {
  return canvas.evaluate((element) => {
    const pixels = element.getContext("2d").getImageData(0, 0, element.width, element.height).data;
    let sum = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index + 3] &&
        pixels[index + 1] > pixels[index] &&
        pixels[index + 1] > pixels[index + 2]
      )
        sum += pixels[index + 1];
    }
    return sum;
  });
}
