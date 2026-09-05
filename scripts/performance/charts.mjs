import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const repository = fileURLToPath(new URL("../../", import.meta.url));
const blog = resolve(repository, "apps/blog");
const preview = resolve(repository, "test-results/performance/chart-preview");
const { values } = parseArgs({
  options: {
    data: { type: "string", default: resolve(blog, "src/generated/performance.json") },
    output: { type: "string", default: resolve(repository, "docs/performance/assets") },
    chromium: { type: "string", default: process.env.PERF_CHROMIUM ?? "/usr/bin/chromium" },
    preview: { type: "boolean", default: false },
  },
});

const panels = [
  { key: "localCold", file: "local-cold", title: "Local · cold browser" },
  { key: "localWarm", file: "local-warm", title: "Local · warm browser" },
  { key: "liveCold", file: "live-cold", title: "Live site · cold browser" },
  { key: "liveWarm", file: "live-warm", title: "Live site · warm browser" },
];
const report = JSON.parse(await readFile(values.data, "utf8"));
validateReport(report);
await writePreview(report);

// Resolve the app's installed toolchain without loading its Worker/build config.
const requireBlog = createRequire(resolve(blog, "package.json"));
const [{ createServer }, { default: react }, { default: tailwindcss }] = await Promise.all(
  ["vite", "@vitejs/plugin-react-swc", "@tailwindcss/vite"].map(
    (name) => import(pathToFileURL(requireBlog.resolve(name)).href),
  ),
);
const server = await createServer({
  configFile: false,
  envDir: false,
  root: preview,
  publicDir: resolve(blog, "public"),
  resolve: { alias: { "@": resolve(blog, "src") }, dedupe: ["react", "react-dom"] },
  plugins: [tailwindcss(), react()],
  optimizeDeps: { entries: ["main.tsx"] },
  server: { host: "127.0.0.1", port: 0, fs: { allow: [repository] } },
});

try {
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string", "Preview server has no TCP address");
  const origin = `http://127.0.0.1:${address.port}`;
  console.log(`Preview entry: ${resolve(preview, "main.tsx")}`);
  console.log(`Preview URL: ${origin}/?chart=localCold&theme=dark`);

  if (values.preview) {
    // The generated entry can be edited for private component QA while Vite runs.
    // It is outside public routes and never enters the production site build.
    console.log("Preview only; Ctrl-C stops the server. No screenshots or browser launched.");
    await new Promise((done) => {
      process.once("SIGINT", done);
      process.once("SIGTERM", done);
    });
  }

  if (!values.preview) {
    await mkdir(values.output, { recursive: true });
    const browser = await chromium.launch({ executablePath: values.chromium, headless: true });
    try {
      for (const panel of panels) {
        for (const theme of ["light", "dark"]) {
          await captureChart(browser, `${origin}/?chart=${panel.key}&theme=${theme}`, panel, theme);
        }
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}

function validateReport(data) {
  assert.ok(data && typeof data === "object", "Performance report must be an object");
  assert.ok(data.charts && typeof data.charts === "object", "Performance report has no charts");
  for (const panel of panels) {
    const rows = data.charts[panel.key];
    assert.ok(Array.isArray(rows) && rows.length > 0, `${panel.key}: no measured chart rows`);
    for (const row of rows) {
      assert.ok(row && typeof row.label === "string" && row.label.length > 0, "Missing page label");
      for (const field of ["baselineMs", "candidateMs"]) {
        assert.ok(
          Number.isFinite(row[field]) && row[field] > 0,
          `${panel.key}/${row.label}: ${field} must be a positive measured time`,
        );
      }
    }
    assert.equal(new Set(rows.map((row) => row.label)).size, rows.length, "Duplicate page labels");
    assert.deepEqual(
      rows.map((row) => row.label).sort(),
      data.charts.localCold.map((row) => row.label).sort(),
      `${panel.key}: page coverage differs from localCold`,
    );
  }
}

async function writePreview(data) {
  await mkdir(preview, { recursive: true });
  await writeFile(resolve(preview, "data.json"), `${JSON.stringify(data, null, 2)}\n`);
  await writeFile(
    resolve(preview, "index.html"),
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>Performance report charts</title></head>
<body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>\n`,
  );
  await writeFile(
    resolve(preview, "preview.css"),
    `@import ${JSON.stringify(relative(preview, resolve(blog, "src/styles/app.css")))};
@source ${JSON.stringify(relative(preview, resolve(blog, "src")))};
html, body { margin: 0; background: var(--background); color: var(--foreground); }
#report { box-sizing: border-box; width: 1200px; padding: 40px 48px; background: var(--background); }
.report-heading { margin: 0 0 8px; font-family: var(--font-serif); font-size: 32px; line-height: 1.2; }
.report-caption { margin: 0 0 28px; color: var(--muted-foreground); font-size: 15px; }
.report-note { margin: 24px 0 0; color: var(--muted-foreground); font-size: 13px; }
`,
  );
  await writeFile(
    resolve(preview, "main.tsx"),
    `import { createRoot } from "react-dom/client";
import { PerformanceComparisonChart } from "@/components/analytics/performance";
import report from "./data.json";
import "./preview.css";

const panels = ${JSON.stringify(panels, null, 2)} as const;
const params = new URLSearchParams(location.search);
const panel = panels.find((item) => item.key === params.get("chart"));
const theme = params.get("theme");
if (!panel || (theme !== "light" && theme !== "dark")) throw new Error("Select a chart and theme");
document.documentElement.classList.toggle("dark", theme === "dark");
document.documentElement.style.colorScheme = theme;
const root = document.getElementById("root");
if (!root) throw new Error("Missing chart root");
createRoot(root).render(
  <main id="report">
    <h1 className="report-heading">{panel.title}</h1>
    <p className="report-caption">Mean navigation load (loadEventEnd), milliseconds. Lower is better.</p>
    <PerformanceComparisonChart rows={report.charts[panel.key]} />
    <p className="report-note">Each origin is compared with its own baseline. Cold browser does not mean cold CDN.</p>
  </main>,
);
`,
  );
}

async function captureChart(browser, url, panel, theme) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) =>
      errors.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
    });
    const response = await page.goto(url, { waitUntil: "load", timeout: 60_000 });
    assert.equal(response.status(), 200, `Could not load ${url}`);
    await page.locator("#report canvas").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      if ([...document.fonts].some((font) => font.status === "error")) {
        throw new Error("A report font failed to load");
      }
    });
    // A canvas element alone can still be blank while series registration and
    // ResizeObserver settle. Require actual alpha pixels, then a stable bitmap.
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector("#report canvas");
        if (!(canvas instanceof HTMLCanvasElement) || !canvas.width || !canvas.height) return false;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Chart has no 2D context");
        return ctx
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.some((value, index) => index % 4 === 3 && value > 0);
      },
      undefined,
      { timeout: 30_000 },
    );
    await page.evaluate(async () => {
      const canvas = document.querySelector("#report canvas");
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Missing painted chart canvas");
      let previous = "";
      let stableFrames = 0;
      for (let frame = 0; frame < 120; frame++) {
        await new Promise(requestAnimationFrame);
        const bitmap = canvas.toDataURL();
        stableFrames = bitmap === previous ? stableFrames + 1 : 0;
        if (stableFrames >= 4) return;
        previous = bitmap;
      }
      throw new Error("Chart pixels did not settle");
    });
    const figure = page.locator("#report figure");
    assert.equal(await figure.locator("ol li").count(), report.charts[panel.key].length);
    const text = await figure.textContent();
    for (const row of report.charts[panel.key])
      assert.ok(text.includes(row.label), `Missing ${row.label}`);
    assert.deepEqual(errors, [], `Browser errors rendering ${panel.file}/${theme}`);
    const destination = resolve(values.output, `${panel.file}-${theme}.png`);
    await page.locator("#report").screenshot({ path: destination, animations: "disabled" });
    assert.deepEqual(errors, [], `Browser errors capturing ${panel.file}/${theme}`);
    await assertTooltipHeadroom(page, panel);
    console.log(destination);
  } finally {
    await context.close();
  }
}

async function assertTooltipHeadroom(page, panel) {
  const chart = page
    .locator("#report figure [role='img'][aria-label^='Performance comparison']")
    .first();
  const box = await chart.boundingBox();
  assert.ok(box, `${panel.file}: chart has no rendered box`);
  const violations = [];
  for (const x of [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.96]) {
    await chart.hover({ position: { x: box.width * x, y: 60 } });
    await page.waitForTimeout(160);
    const bounds = await page.evaluate(() => {
      const figure = document.querySelector("#report figure");
      const chartRoot = figure?.querySelector("[role='img'][aria-label^='Performance comparison']");
      const tooltip = [...(figure?.querySelectorAll(".pointer-events-none") ?? [])].find(
        (element) =>
          element.textContent?.includes("baseline") && element.textContent.includes("candidate"),
      );
      if (!(chartRoot instanceof HTMLElement) || !(tooltip instanceof HTMLElement)) {
        return null;
      }
      const chartRect = chartRoot.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      return {
        chartTop: chartRect.top,
        tooltipTop: tooltipRect.top,
        tooltipText: tooltip.textContent,
      };
    });
    assert.ok(bounds, `${panel.file}: tooltip did not appear on hover`);
    if (bounds.tooltipTop < bounds.chartTop) violations.push(bounds);
  }
  assert.deepEqual(violations, [], `${panel.file}: tooltip clipped above chart`);
}
