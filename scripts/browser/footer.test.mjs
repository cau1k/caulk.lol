import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { expect } from "playwright/test";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const blog = resolve(repository, "apps/blog");
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
    // Each concurrently running fixture owns its dependency scan and cache.
    cacheDir: resolve(repository, "node_modules/.vite/footer"),
    optimizeDeps: { entries: [fileURLToPath(new URL("./fixtures/footer.html", import.meta.url))] },
    publicDir: resolve(blog, "public"),
    resolve: {
      alias: {
        "@": resolve(blog, "src"),
        "@tanstack/react-router": requireBlog.resolve("@tanstack/react-router"),
      },
      dedupe: ["react", "react-dom"],
    },
    plugins: [tailwindcss(), react()],
    server: { host: "127.0.0.1", port: 0, fs: { allow: [repository] } },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ executablePath: process.env.PERF_CHROMIUM });
  await mkdir(resolve(repository, "test-results/footer"), { recursive: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

for (const width of [320, 390, 640, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`footer remains readable at ${width}px in ${theme} mode`, async (t) => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
      t.after(() => page.close());
      const errors = [];
      const artworkRequests = [];
      const artworkResponses = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (request.url().endsWith("/media/roman.webp")) artworkRequests.push(request.url());
      });
      page.on("response", (response) => {
        if (response.url().endsWith("/media/roman.webp")) artworkResponses.push(response);
      });
      await page.goto(`${origin}/footer.html?theme=${theme}`);
      const footer = page.getByRole("contentinfo");
      await footer.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        artworkRequests.length,
        0,
        "offscreen artwork must not compete with the page load",
      );
      await footer.scrollIntoViewIfNeeded();
      const pageWidth = await page.getByRole("main").boundingBox();
      const introduction = await footer.locator(":scope > div").first().boundingBox();
      assert.ok(
        Math.abs(introduction.x - pageWidth.x) < 1,
        "footer text aligns with the page column",
      );
      assert.ok(
        Math.abs(introduction.width - pageWidth.width) < 1,
        "footer text uses the page's constrained width",
      );

      // Measure glyphs rather than the grid cells: overflowing text can overlap
      // another column even when every cell itself fits inside the viewport.
      const headings = await footer.locator("h2").evaluateAll((elements) =>
        elements.map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getBoundingClientRect().toJSON();
        }),
      );
      headings
        .slice(1)
        .forEach((heading, index) =>
          assert.ok(
            heading.left - headings[index].right >= 8,
            "footer headings need at least 8px of clear space",
          ),
        );
      const dimensions = await footer.evaluate((element) => ({
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      assert.ok(
        dimensions.scrollWidth <= dimensions.width + 1,
        "footer must not scroll horizontally",
      );

      const artwork = footer.locator(':scope > div[aria-hidden="true"]');
      await expect(artwork).toBeVisible();
      await expect.poll(() => artworkResponses.length).toBe(1);
      assert.ok(artworkResponses[0].ok(), "the mask asset must load successfully");
      await artworkResponses[0].finished();
      assert.equal(artworkRequests.length, 1, "the artwork loads once as it enters view");
      const colors = await artwork.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          mode: style.maskMode,
          ink: style.backgroundColor,
          primary: getComputedStyle(element.closest("footer").querySelector("a")).color,
        };
      });
      assert.equal(colors.mode, "luminance", "black sky must not become an opaque rectangle");
      assert.equal(
        colors.ink.replace(/\s/g, ""),
        colors.primary.replace(/\s/g, ""),
        "ink follows the active theme primary",
      );
      const bounds = await artwork.boundingBox();
      assert.equal(bounds.x, 0, "the artwork still reaches the viewport edge");
      assert.ok(
        Math.abs(bounds.width - (await page.locator("body").boundingBox()).width) < 1,
        "only the artwork spans the viewport",
      );
      assert.ok(
        Math.abs(bounds.width / bounds.height - 16 / 9) < 0.01,
        "the scene must occupy a 16:9 frame",
      );
      const nav = await footer.getByRole("navigation").boundingBox();
      assert.ok(nav.y + nav.height < bounds.y, "artwork must remain below the links");
      const copyright = footer.getByText(/caulk.lol ©/);
      const creditBounds = await copyright.boundingBox();
      assert.ok(
        creditBounds.y > bounds.y + bounds.height / 2,
        "copyright belongs near the bottom of the scenery",
      );
      assert.ok(
        creditBounds.y + creditBounds.height <= bounds.y + bounds.height,
        "copyright stays inside the scenery",
      );
      const textBounds = await footer
        .locator("a, p, h2")
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().toJSON()),
        );
      textBounds.forEach((box) =>
        assert.ok(
          box.x >= pageWidth.x && box.right <= pageWidth.x + pageWidth.width + 1,
          "all footer text stays inside the content column",
        ),
      );
      await assertColophonContrast(copyright);
      await footer.screenshot({
        path: resolve(repository, `test-results/footer/${width}-${theme}.png`),
      });
      assert.deepEqual(errors, []);
    });
  }
}

/** Resolve actual theme colors through the browser, then apply WCAG contrast math. */
async function assertColophonContrast(copyright) {
  const contrast = await copyright.evaluate((element) => {
    const row = element.parentElement;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("Missing color measurement context");
    const pixels = (color) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const luminance = (rgba) =>
      rgba
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const background = pixels(getComputedStyle(row).backgroundColor);
    const backgroundLuminance = luminance(background);
    return {
      alpha: background[3],
      ratios: Array.from(row.querySelectorAll("p"), (paragraph) => {
        const foreground = luminance(pixels(getComputedStyle(paragraph).color));
        return (
          (Math.max(foreground, backgroundLuminance) + 0.05) /
          (Math.min(foreground, backgroundLuminance) + 0.05)
        );
      }),
    };
  });
  assert.equal(contrast.alpha, 255, "a solid backing keeps scenery from reducing text contrast");
  contrast.ratios.forEach((ratio) =>
    assert.ok(ratio >= 4.5, `colophon contrast ${ratio.toFixed(2)} must meet 4.5:1`),
  );
}
