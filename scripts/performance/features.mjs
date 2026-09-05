import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { expect } from "playwright/test";
import { publicResources, publicRoutes } from "./routes.mjs";

const { values } = parseArgs({
  options: {
    local: { type: "string", default: "http://127.0.0.1:4317" },
    live: { type: "string", default: "https://caulk.lol" },
    chromium: { type: "string" },
    output: { type: "string", default: "test-results/performance/features" },
    baseline: { type: "string" },
    path: { type: "string", multiple: true },
  },
});
const routes = await publicRoutes();
const baseline = values.baseline ? JSON.parse(await readFile(values.baseline, "utf8")) : [];
const results = [];
const browser = await chromium.launch({
  executablePath: values.chromium ?? process.env.PERF_CHROMIUM,
});
await mkdir(values.output, { recursive: true });
try {
  for (const [target, origin] of Object.entries({ local: values.local, live: values.live })) {
    if (origin === "off") continue;
    for (const route of routes.filter(
      (route) => !values.path || values.path.includes(route.path),
    )) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: "dark",
        permissions: ["clipboard-read", "clipboard-write"],
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const result = { target, path: route.path, errors };
      try {
        const response = await page.goto(new URL(route.path, origin).href);
        assert.equal(response.status(), 200);
        await page.waitForFunction(() => document.querySelector("#theme-toggle-input")?.checked);
        // Exercise actual event handlers as well as the benchmark's hydration signal.
        await page.locator("#theme-toggle-input").first().click();
        await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
        // Finish the 150 ms theme transition before testing a second transition.
        await page.waitForTimeout(200);
        // Theme hotkeys intentionally ignore focused inputs.
        await page.keyboard.press("Tab");
        await page.keyboard.press("d");
        await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
        for (const name of ["archive", "links", "about"]) {
          assert.equal(
            await page.locator("#nd-nav").getByRole("link", { name, exact: true }).isVisible(),
            true,
          );
        }
        const postLinks = await page
          .locator('main a[href^="/posts/"]')
          .evaluateAll((links) =>
            links.map((link) => new URL(link.href).pathname.replace(/\/$/, "")),
          );
        const postPaths = routes
          .filter((route) => route.kind === "post")
          .map((route) => route.path);
        if (route.path === "/posts") {
          assert.deepEqual([...new Set(postLinks)].sort(), postPaths.sort());
        }
        if (route.path === "/posts/tags") {
          assert.deepEqual(
            [...new Set(postLinks.map((path) => path.toLowerCase()))].sort(),
            routes
              .filter((route) => route.kind === "tag")
              .map((route) => route.path)
              .sort(),
          );
        }
        if (route.kind === "tag") {
          assert.ok(
            postLinks.some((path) => postPaths.includes(path)),
            "Tag has no published posts",
          );
        }
        if (route.kind === "post") {
          assert.equal(await page.locator("article > header h1").textContent(), route.title);
          assert.ok(await page.locator('meta[property="og:image"]').getAttribute("content"));
          await page.getByRole("button", { name: "Open in", exact: true }).click();
          for (const name of [
            "Open in GitHub",
            "Open in ChatGPT",
            "Open in Claude",
            "Open in T3 Chat",
          ]) {
            await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
          }
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: "Copy", exact: true }).first().click();
          await page.waitForFunction(
            async () => (await navigator.clipboard.readText()).length > 100,
          );
          result.markdownLength = await page.evaluate(
            async () => (await navigator.clipboard.readText()).length,
          );
          // Fingerprint substantive article text; footer timing and dynamic canvas
          // labels are excluded. This catches content lost through lazy rendering.
          const prose = page.locator("article .prose");
          await prose.waitFor();
          const text = await prose.evaluate((element) => {
            const copy = element.cloneNode(true);
            for (const node of copy.querySelectorAll("svg, style")) node.remove();
            return copy.textContent;
          });
          result.contentHash = createHash("sha256")
            .update(text.replace(/\s+/g, " ").trim())
            .digest("hex");
          const previous = baseline.find((row) => row.target === target && row.path === route.path);
          if (previous?.contentHash)
            assert.equal(result.contentHash, previous.contentHash, "Article content changed");
          for (const button of await prose.locator("button[aria-expanded]").all()) {
            await button.click();
            await expect(button).toHaveAttribute("aria-expanded", "true");
            await button.click();
          }
          for (const image of await prose.locator("img").all()) {
            await image.scrollIntoViewIfNeeded();
            await image.evaluate((image) => image.decode());
          }
          if (route.path === "/posts/prompt-caching-sucks") {
            await page
              .locator('svg[aria-label="Dynamic context diagram"]')
              .waitFor({ timeout: 60_000 });
          }
        }
        if (route.path === "/links") {
          result.linkCount = await page.locator("main ol > li").count();
          assert.ok(result.linkCount > 0, "Link fixture/content missing");
          const preview = page.waitForResponse((response) =>
            response.url().includes("/api/link-preview-image?"),
          );
          await page.locator("main ol > li").first().hover();
          assert.equal((await preview).status(), 200);
        }
        if (route.path === "/analytics") {
          for (const text of ["Requests", "p95 latency", "Average", "5xx", "Latency over time"]) {
            assert.equal(await page.getByText(text, { exact: true }).first().isVisible(), true);
          }
          await page.waitForFunction(() => !document.body.textContent.includes("source: empty"));
          result.analyticsSource = await page
            .locator("main p")
            .filter({ hasText: "source:" })
            .textContent();
        }
        await page.locator("body > footer, footer").last().scrollIntoViewIfNeeded();
        assert.ok(await page.locator('footer a[href="https://x.com/zerocaulk"]').count());
        assert.ok((await page.locator("canvas").count()) >= 2, "Star background missing");
        await page.setViewportSize({ width: 375, height: 812 });
        await page.evaluate(() => window.scrollTo(0, 0));
        const menu = page.getByRole("button", { name: "Toggle Menu", exact: true });
        if (await menu.isVisible()) {
          await menu.click();
          await expect(menu).toHaveAttribute("aria-expanded", "true");
          await page.keyboard.press("Escape");
        }
        await page.screenshot({
          path: `${values.output}/${target}-${route.path.replaceAll("/", "_") || "home"}.png`,
        });
      } catch (error) {
        errors.push(error.stack ?? error.message);
      }
      results.push(result);
      console.log(
        `${target} ${route.path}: ${errors.length ? `FAIL ${errors.join("; ")}` : "pass"}`,
      );
      await context.close();
    }
    for (const resource of values.path ? [] : publicResources(routes)) {
      const result = { target, path: resource.path, errors: [] };
      try {
        const response = await fetch(new URL(resource.path, origin), {
          signal: AbortSignal.timeout(60_000),
        });
        assert.equal(response.status, 200);
        assert.ok(response.headers.get("content-type")?.includes(resource.type));
        assert.ok((await response.arrayBuffer()).byteLength > 10);
      } catch (error) {
        result.errors.push(error.message);
      }
      results.push(result);
    }
  }
} finally {
  await browser.close();
  await writeFile(`${values.output}/results.json`, `${JSON.stringify(results, null, 2)}\n`);
}
if (results.some((result) => result.errors.length)) process.exitCode = 1;
