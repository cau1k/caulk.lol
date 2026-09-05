import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { expect } from "playwright/test";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const blog = resolve(repository, "apps/blog");
const labels = ["/", "/posts/prompt-caching-sucks", "/posts/typescript-as-a-scripting-language"];
const indices = [0, 7, 19];
let server;
let browser;
let origin;

before(async () => {
  const requireBlog = createRequire(resolve(blog, "package.json"));
  const [{ createServer }, { default: react }, { default: tailwindcss }] = await Promise.all(
    ["vite", "@vitejs/plugin-react-swc", "@tailwindcss/vite"].map(
      (name) => import(pathToFileURL(requireBlog.resolve(name)).href),
    ),
  );
  server = await createServer({
    configFile: false,
    envDir: false,
    root: fileURLToPath(new URL("./fixtures", import.meta.url)),
    // Keep the chart's dependency optimizer independent of other browser suites.
    cacheDir: resolve(repository, "node_modules/.vite/tooltip"),
    optimizeDeps: { entries: [fileURLToPath(new URL("./fixtures/index.html", import.meta.url))] },
    publicDir: resolve(blog, "public"),
    resolve: { alias: { "@": resolve(blog, "src") }, dedupe: ["react", "react-dom"] },
    plugins: [tailwindcss(), react()],
    server: { host: "127.0.0.1", port: 0, fs: { allow: [repository] } },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ executablePath: process.env.PERF_CHROMIUM });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

for (const width of [1200, 390]) {
  for (const theme of ["light", "dark"]) {
    test(`tooltip stays visible at ${width}px in ${theme} mode`, async (t) => {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        colorScheme: theme,
        reducedMotion: "no-preference",
      });
      t.after(() => page.close());
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${origin}/?theme=${theme}`);
      const chart = page.locator('[aria-label^="Performance comparison chart"]');
      await chart.waitFor();
      await page.evaluate(() => document.fonts.ready);

      for (const [index, label] of labels.entries()) {
        await t.test(`top edge, category ${index + 1}`, async () => {
          await hoverCategory(page, chart, indices[index]);
          // Find the real tooltip by its displayed heading, so this test also
          // exercises the unmodified vendor component before the fix.
          const tooltip = chart.getByText(label, { exact: true }).locator("..");
          await expect(tooltip).toHaveCSS("opacity", "1");
          // A longer heading can resize an already visible card while it is
          // moving. Check that frame as well as the settled position.
          await assertUnclipped(tooltip);
          await waitForPosition(tooltip);
          await assertUnclipped(tooltip);
          await expect(tooltip.getByText("baseline", { exact: true })).toBeVisible();
          await expect(tooltip.getByText("candidate", { exact: true })).toBeVisible();
        });
      }

      if (width === 390) {
        await t.test("long tooltip remeasures while the container shrinks", async () => {
          await hoverCategory(page, chart, 7);
          const tooltip = chart.getByText(labels[1], { exact: true }).locator("..");
          await expect(tooltip).toHaveCSS("opacity", "1");
          await page.setViewportSize({ width: 320, height: 1000 });
          await expect.poll(async () => (await chart.boundingBox()).width).toBeLessThan(300);
          await waitForPosition(tooltip);
          await assertUnclipped(tooltip);
        });
      }
      assert.deepEqual(errors, []);
    });
  }
}

async function hoverCategory(page, chart, index) {
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  // PerformanceComparisonChart's actual plot margins: left 54, right 16.
  await page.mouse.move(box.x + 54 + ((box.width - 70) * (index + 0.5)) / 20, box.y + 80);
}

async function assertUnclipped(tooltip) {
  const geometry = await tooltip.evaluate((element) => {
    const card = element.getBoundingClientRect();
    const clip = { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
    // BoundingClientRect alone reports the full card even when CSS hides it.
    // Intersect every clipping ancestor, including overflow-y:auto computed
    // from an overflow-x:auto wrapper, then check all four painted edges.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const rect = parent.getBoundingClientRect();
      if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) {
        clip.left = Math.max(clip.left, rect.left);
        clip.right = Math.min(clip.right, rect.right);
      }
      if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) {
        clip.top = Math.max(clip.top, rect.top);
        clip.bottom = Math.min(clip.bottom, rect.bottom);
      }
    }
    return {
      card: { top: card.top, left: card.left, right: card.right, bottom: card.bottom },
      clip,
      contentFits: element.scrollWidth <= element.clientWidth,
    };
  });
  for (const edge of ["top", "left", "right", "bottom"]) {
    const distance = ["top", "left"].includes(edge)
      ? geometry.card[edge] - geometry.clip[edge]
      : geometry.clip[edge] - geometry.card[edge];
    assert.ok(
      distance >= -0.5,
      `${edge} clipped by ${(-distance).toFixed(1)}px: ${JSON.stringify(geometry)}`,
    );
  }
  assert.ok(geometry.contentFits, "Tooltip text must wrap within the visible card");
}

async function waitForPosition(tooltip) {
  let previous;
  let stable = 0;
  await expect
    .poll(
      async () => {
        const box = await tooltip.boundingBox();
        const position = JSON.stringify(Object.values(box).map((value) => Math.round(value * 10)));
        stable = position === previous ? stable + 1 : 0;
        previous = position;
        return stable;
      },
      { timeout: 3000, intervals: [50] },
    )
    .toBeGreaterThanOrEqual(3);
}
