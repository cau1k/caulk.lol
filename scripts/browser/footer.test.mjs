import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { assertShootingStarMotion } from "./motion.mjs";
import { assertMeteorAppearance } from "./meteor.mjs";

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

test("shooting stars continue in page space offscreen and preserve explicit pauses", async (t) => {
  const page = await browser.newPage({
    viewport: { width: 800, height: 300 },
    reducedMotion: "no-preference",
  });
  t.after(() => page.close());
  await assertShootingStarMotion(page, origin);
});

for (const theme of ["light", "dark"]) {
  test(`shooting-star light is continuous and subdued in ${theme} mode`, async (t) => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    t.after(() => page.close());
    await assertMeteorAppearance(page, origin, blog, theme, repository);
  });
}

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
        const style = getComputedStyle(element.querySelector('[data-scene-layer="ink"]'));
        return {
          mode: style.maskMode,
          ink: style.backgroundColor,
          primary: getComputedStyle(element.closest("footer").querySelector('a[href="/"]')).color,
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
      const inkTop = await firstInkTop(artwork);
      assert.ok(nav.y + nav.height + 8 < inkTop, "visible ink must remain clear of the links");
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

for (const theme of ["light", "dark"]) {
  test(`only colonnade openings reveal shooting stars within the scenery in ${theme} mode`, async (t) => {
    const page = await browser.newPage({
      viewport: { width: 1314, height: 1034 },
      reducedMotion: "reduce",
    });
    t.after(() => page.close());
    await page.goto(`${origin}/footer.html?short&theme=${theme}`);
    const artwork = page.locator('footer > div[aria-hidden="true"]');
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await artwork.locator("[data-scene-layer]").evaluateAll((layers) =>
      Promise.all(
        layers.map(async (layer) => {
          const image = new Image();
          image.src = getComputedStyle(layer).maskImage.slice(5, -2);
          await image.decode();
        }),
      ),
    );
    // An opaque probe on the real shooting-star canvas makes every transparent
    // engraving gap obvious, independently of the random star positions.
    await page
      .locator("canvas")
      .nth(1)
      .evaluate((canvas) => {
        canvas.style.backgroundColor = "rgb(255, 0, 255)";
      });
    const screenshot = await artwork.screenshot({
      path: resolve(repository, `test-results/footer/openings-${theme}.png`),
    });
    const pixels = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const at = (x, y) =>
        Array.from(
          context.getImageData(Math.floor(x * image.width), Math.floor(y * image.height), 1, 1)
            .data,
        );
      return {
        sky: at(0.5, 0.05),
        columns: [
          at(1095 / 1672, 330 / 941),
          at(1128 / 1672, 330 / 941),
          at(1170 / 1672, 320 / 941),
          at(1208 / 1672, 330 / 941),
          at(1255 / 1672, 310 / 941),
          at(1310 / 1672, 280 / 941),
          at(1370 / 1672, 265 / 941),
        ],
        branches: at(803 / 1672, 456 / 941),
        vegetation: at(700 / 1672, 510 / 941),
        steps: at(565 / 1672, 820 / 941),
        terrain: at(850 / 1672, 700 / 941),
      };
    }, screenshot.toString("base64"));
    assert.deepEqual(pixels.sky, [255, 0, 255, 255], "open sky keeps the stars visible");
    for (const pixel of pixels.columns) {
      assert.ok(
        pixel[0] > 240 && pixel[1] < 20 && pixel[2] > 240,
        `open space between columns must reveal shooting stars: ${pixel}`,
      );
    }
    for (const surface of ["branches", "vegetation", "steps", "terrain"]) {
      assert.ok(
        pixels[surface][1] >= pixels[surface][0] - 4,
        `shooting-star color leaked through ${surface}: ${pixels[surface]}`,
      );
    }
  });

  test(`footer artwork sits above shooting stars with a transparent sky in ${theme} mode`, async (t) => {
    const page = await browser.newPage({
      viewport: { width: 1314, height: 1034 },
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    t.after(() => page.close());
    await page.goto(`${origin}/footer.html?short&theme=${theme}`);
    const footer = page.getByRole("contentinfo");
    await footer.waitFor();
    assert.equal(
      await footer.evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgba(0, 0, 0, 0)",
      "the footer must leave the background star field visible",
    );
    const artwork = footer.locator(':scope > div[aria-hidden="true"]');
    await artwork.scrollIntoViewIfNeeded();
    await expect(artwork).toBeVisible();
    const canvases = page.locator("canvas");
    await expect(canvases).toHaveCount(2);
    // Include decorative canvases in hit testing without altering paint order.
    // This detects stacking-context mistakes that comparing z-index values misses.
    await canvases.evaluateAll((elements) => {
      elements.forEach((element) => {
        element.style.pointerEvents = "auto";
      });
    });
    await artwork.evaluate((element) => {
      element.style.pointerEvents = "auto";
    });
    for (const target of [artwork, footer.getByText(/caulk.lol ©/)]) {
      await target.scrollIntoViewIfNeeded();
      assert.ok(
        await target.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return top === element || element.contains(top);
        }),
        "artwork must paint above shooting stars, with copyright above the artwork",
      );
    }
  });

  test(`scenery peeks into the initial short-page viewport in ${theme} mode`, async (t) => {
    const page = await browser.newPage({
      viewport: { width: 1314, height: 1034 },
      colorScheme: theme,
    });
    t.after(() => page.close());
    await page.goto(`${origin}/footer.html?short&theme=${theme}`);
    await page.evaluate(() => document.fonts.ready);
    const footer = page.getByRole("contentinfo");
    const artwork = footer.locator(':scope > div[aria-hidden="true"]');
    await expect(artwork).toBeVisible();
    const inkTop = await firstInkTop(artwork);
    const visibleHeight = page.viewportSize().height - inkTop;
    assert.ok(
      visibleHeight >= 24 && visibleHeight <= 180,
      `only a little scenery should appear without scrolling; found ${visibleHeight.toFixed(1)}px`,
    );
    assert.equal(await page.evaluate(() => scrollY), 0, "visibility must not require scrolling");
    assert.ok(
      (await footer.getByText(/caulk.lol ©/).boundingBox()).y > page.viewportSize().height,
      "copyright stays at the page bottom",
    );
    await page.screenshot({ path: resolve(repository, `test-results/footer/fold-${theme}.png`) });
  });
}

/** Measure visible engraving, not the mask box's transparent sky. Ignore isolated
 * compression specks by requiring at least 16 bright pixels in a source row. */
async function firstInkTop(artwork) {
  return artwork.evaluate(async (element) => {
    const image = new Image();
    image.src = getComputedStyle(element.querySelector('[data-scene-layer="ink"]')).maskImage.slice(
      5,
      -2,
    );
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing mask measurement context");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const row = Array.from({ length: canvas.height }, (_, y) => y).find((y) => {
      let ink = 0;
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4] > 128) ink++;
      }
      return ink >= 16;
    });
    if (row === undefined) throw new Error("Mask contains no visible engraving");
    const bounds = element.getBoundingClientRect();
    return bounds.top + (row / canvas.height) * bounds.height;
  });
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
    return {
      rowAlpha: pixels(getComputedStyle(row).backgroundColor)[3],
      rowShadow: getComputedStyle(row).boxShadow,
      groups: Array.from(row.querySelectorAll("p"), (paragraph) => {
        const style = getComputedStyle(paragraph);
        const background = pixels(style.backgroundColor);
        const backgroundLuminance = luminance(background);
        const foreground = luminance(pixels(style.color));
        return {
          bounds: paragraph.getBoundingClientRect().toJSON(),
          alpha: background[3],
          shadow: style.boxShadow,
          shadowColor: style.getPropertyValue("--tw-shadow-color"),
          shadowAlpha: pixels(style.getPropertyValue("--tw-shadow-color"))[3],
          ratio:
            (Math.max(foreground, backgroundLuminance) + 0.05) /
            (Math.min(foreground, backgroundLuminance) + 0.05),
        };
      }),
    };
  });
  assert.equal(contrast.rowAlpha, 0, "the gap between text groups must reveal the artwork");
  assert.equal(contrast.rowShadow, "none", "a shared shadow must not bridge the gap");
  const [copyrightBounds, timingBounds] = contrast.groups.map((group) => group.bounds);
  assert.ok(
    timingBounds.left - copyrightBounds.right >= 32 ||
      timingBounds.top - copyrightBounds.bottom >= 16,
    "copyright and timings need space between their separate backings",
  );
  contrast.groups.forEach(({ alpha, shadow, shadowColor, shadowAlpha, ratio }) => {
    assert.equal(alpha, 255, "each text group retains its own solid contrast backing");
    assert.notEqual(shadow, "none", "each text group needs its own soft shadow");
    assert.ok(shadowColor, "the theme supplies the shadow color");
    assert.ok(shadowAlpha >= 128 && shadowAlpha <= 204, "shadows must be partly transparent");
    assert.ok(ratio >= 4.5, `colophon contrast ${ratio.toFixed(2)} must meet 4.5:1`);
  });
}
