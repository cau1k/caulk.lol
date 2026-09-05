/** Installed before page scripts so paint/long-task entries include startup work. */
export function observePage() {
  const measurements = { lcpMs: 0, hydrationMs: 0, appReadyMs: 0, longTasks: [] };
  window.__pageMeasurements = measurements;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) measurements.lcpMs = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      measurements.longTasks.push({ start: entry.startTime, duration: entry.duration });
    }
  }).observe({ type: "longtask", buffered: true });
  // All current public layouts SSR an unchecked theme control, then hydrate it
  // to the browser's dark preference. This measures real startup without adding
  // a benchmark-only application hook or treating SSR content as interactive.
  function check() {
    if (document.querySelector("#theme-toggle-input")?.checked && !measurements.hydrationMs) {
      measurements.hydrationMs = performance.now();
    }
    const analyticsReady =
      location.pathname !== "/analytics" ||
      performance
        .getEntriesByType("resource")
        .some((entry) => new URL(entry.name).pathname === "/api/analytics");
    const diagram = document.querySelector("article figure");
    const diagramReady =
      location.pathname !== "/posts/prompt-caching-sucks" ||
      !diagram ||
      diagram.getBoundingClientRect().top >= innerHeight ||
      Boolean(diagram.querySelector("svg"));
    if (
      measurements.hydrationMs &&
      analyticsReady &&
      diagramReady &&
      document.fonts.status === "loaded"
    ) {
      measurements.appReadyMs = performance.now();
      return;
    }
    requestAnimationFrame(check);
  }
  requestAnimationFrame(check);
}

export async function measure(page, url, route) {
  const errors = [];
  const failedRequests = [];
  const onError = (error) => errors.push(error.message);
  const onRequestFailed = (request) =>
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  page.on("pageerror", onError);
  page.on("requestfailed", onRequestFailed);
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 60_000 });
    if (response?.status() !== 200) throw new Error(`HTTP ${response?.status()}`);
    await page.waitForFunction(() => window.__pageMeasurements?.appReadyMs > 0, undefined, {
      timeout: 30_000,
    });
    // Let the LCP observer flush. This wait is not added to the measured times.
    await page.waitForTimeout(700);
    const result = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const timing = window.__pageMeasurements;
      const resources = performance.getEntriesByType("resource").map((entry) => ({
        url: entry.name,
        type: entry.initiatorType,
        start: entry.startTime,
        duration: entry.duration,
        transferBytes: entry.transferSize,
        encodedBytes: entry.encodedBodySize,
        decodedBytes: entry.decodedBodySize,
      }));
      return {
        loadMs: nav.loadEventEnd,
        fcpMs: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
        lcpMs: timing.lcpMs,
        hydrationMs: timing.hydrationMs,
        appReadyMs: timing.appReadyMs,
        readyMs: Math.max(nav.loadEventEnd, timing.lcpMs, timing.appReadyMs),
        ttfbMs: nav.responseStart,
        transferBytes:
          nav.transferSize + resources.reduce((sum, resource) => sum + resource.transferBytes, 0),
        navigation: nav.toJSON(),
        resources,
        longTasks: timing.longTasks,
        title: document.title,
        heading: document.querySelector("h1")?.textContent,
        text: (document.querySelector("main") ?? document.querySelector("article"))?.textContent,
      };
    });
    if (!result.text || result.text.length < 30) throw new Error("Public content missing");
    if (/Links unavailable|Application Error|Something went wrong/.test(result.text)) {
      throw new Error(`Page rendered an error: ${result.text.slice(0, 250)}`);
    }
    if (route.title && result.heading !== route.title)
      throw new Error(`Wrong article: ${result.heading}`);
    const headers = await response.allHeaders();
    return {
      ...result,
      text: undefined,
      failedRequests,
      ...(errors.length ? { error: `Browser errors: ${errors.join("; ")}` } : {}),
      headers: Object.fromEntries(
        [
          "cache-control",
          "cf-cache-status",
          "age",
          "server-timing",
          "etag",
          "content-encoding",
        ].map((name) => [name, headers[name] ?? null]),
      ),
    };
  } finally {
    page.off("pageerror", onError);
    page.off("requestfailed", onRequestFailed);
  }
}
