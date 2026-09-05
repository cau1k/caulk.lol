import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { chromium } from "playwright";
import { configureNetwork } from "./network.mjs";

test("benchmark network limit actually delays a local response", async () => {
  const server = createServer((request, response) => {
    response.setHeader("content-type", "text/html");
    response.setHeader("cache-control", "no-store");
    response.end(request.url === "/small" ? "small" : `<p>${"x".repeat(100_000)}</p>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.PERF_CHROMIUM });
  try {
    const page = await browser.newPage();
    await configureNetwork(await page.context().newCDPSession(page), {
      cpuRate: 1,
      latencyMs: 120,
      downloadBytesPerSecond: 50_000,
      uploadBytesPerSecond: 50_000,
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const timing = await page.evaluate(() =>
      performance.getEntriesByType("navigation")[0].toJSON(),
    );
    assert.ok(timing.responseEnd >= 1900, `Bandwidth was not applied: ${timing.responseEnd}ms`);
    // Chromium's Navigation Timing responseStart records the real transport
    // headers before DevTools delays delivery. A fetch measures that delivery.
    const latency = await page.evaluate(async () => {
      const start = performance.now();
      await (await fetch("/small")).text();
      return performance.now() - start;
    });
    assert.ok(latency >= 110, `Latency was not applied: ${latency}ms`);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
