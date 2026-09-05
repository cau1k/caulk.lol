import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { measure, observePage } from "./browser.mjs";
import { configureNetwork } from "./network.mjs";
import { compare, markdown, summarize } from "./report.mjs";
import { publicRoutes } from "./routes.mjs";

const { values } = parseArgs({
  options: {
    local: { type: "string", default: "http://127.0.0.1:4317" },
    live: { type: "string", default: "https://caulk.lol" },
    runs: { type: "string", default: "5" },
    label: { type: "string", default: "measurement" },
    output: { type: "string", default: "test-results/performance" },
    baseline: { type: "string" },
    path: { type: "string", multiple: true },
    chromium: { type: "string" },
    unthrottled: { type: "boolean", default: false },
    serve: { type: "boolean", default: false },
    directory: { type: "string", default: "apps/blog/dist" },
  },
});

const runs = Number(values.runs);
if (!Number.isSafeInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");
const inventory = await publicRoutes();
const routes = values.path
  ? inventory.filter((route) => values.path.includes(route.path))
  : inventory;
if (!routes.length || values.path?.some((path) => !routes.some((route) => route.path === path))) {
  throw new Error("Unknown or empty route selection");
}
const profile = {
  networkRule: "global-empty-url-pattern",
  viewport: { width: 1440, height: 900 },
  colorScheme: "dark",
  cpuRate: values.unthrottled ? 1 : 4,
  latencyMs: values.unthrottled ? 0 : 40,
  downloadBytesPerSecond: values.unthrottled ? -1 : 1_250_000,
  uploadBytesPerSecond: values.unthrottled ? -1 : 625_000,
};
const targets = Object.entries({ local: values.local, live: values.live }).filter(
  ([, url]) => url !== "off",
);
await mkdir(values.output, { recursive: true });
let server;
if (values.serve) {
  const local = new URL(values.local);
  if (!["127.0.0.1", "localhost"].includes(local.hostname))
    throw new Error("--serve requires a loopback local URL");
  const log = await open(path.join(values.output, `${values.label}-server.log`), "w");
  server = spawn(
    process.execPath,
    [
      new URL("./serve.mjs", import.meta.url).pathname,
      "--directory",
      values.directory,
      "--port",
      local.port || "80",
    ],
    { stdio: ["ignore", log.fd, log.fd] },
  );
  await log.close();
  const deadline = Date.now() + 60_000;
  while (true) {
    if (server.exitCode !== null)
      throw new Error(`Local server exited with ${server.exitCode}; see server log`);
    try {
      if ((await fetch(local, { signal: AbortSignal.timeout(1000) })).ok) break;
    } catch {
      /* A refused connection is expected before workerd has bound its port. */
    }
    if (Date.now() >= deadline) {
      server.kill("SIGTERM");
      throw new Error("Local server did not become ready within 60 seconds");
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
const browser = await chromium.launch({
  executablePath: values.chromium ?? process.env.PERF_CHROMIUM,
  headless: true,
});
const report = {
  schemaVersion: 1,
  label: values.label,
  startedAt: new Date().toISOString(),
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: Boolean(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()),
  harnessHash: createHash("sha256")
    .update(
      (
        await Promise.all(
          ["browser.mjs", "network.mjs", "report.mjs", "routes.mjs", "run.mjs"].map((file) =>
            readFile(new URL(file, import.meta.url), "utf8"),
          ),
        )
      ).join("\n"),
    )
    .digest("hex"),
  browser: browser.version(),
  profile,
  runs,
  inventory,
  targets: Object.fromEntries(targets),
  samples: [],
  summary: [],
};
const output = path.join(values.output, values.label);
async function save() {
  report.summary = summarize(report.samples);
  await writeFile(`${output}.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${output}.md`, markdown(report));
}

try {
  // Interleave origins and rotate page order to limit time-of-day/cache bias.
  // One page at a time: concurrent browsers would compete for CPU/network.
  for (let run = 0; run < runs; run++) {
    const ordered = [...routes.slice(run % routes.length), ...routes.slice(0, run % routes.length)];
    for (const route of ordered) {
      for (const [target, origin] of run % 2 ? targets.toReversed() : targets) {
        const context = await browser.newContext({
          viewport: profile.viewport,
          colorScheme: profile.colorScheme,
        });
        await context.addInitScript(observePage);
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await configureNetwork(cdp, profile);
        await cdp.send("Network.clearBrowserCache");
        for (const cache of ["cold", "warm"]) {
          const sample = {
            run: run + 1,
            target,
            path: route.path,
            cache,
            measuredAt: new Date().toISOString(),
          };
          try {
            if (server && server.exitCode !== null)
              throw new Error(`Local server stopped (${server.exitCode})`);
            await page.goto("about:blank");
            Object.assign(sample, await measure(page, new URL(route.path, origin).href, route));
            console.log(
              `[${run + 1}/${runs}] ${target} ${cache} ${route.path}: load ${sample.loadMs.toFixed(0)}ms; ready ${sample.readyMs.toFixed(0)}ms${sample.error ? `; FAIL ${sample.error}` : ""}`,
            );
          } catch (error) {
            sample.error = error.message;
            console.error(
              `[${run + 1}/${runs}] ${target} ${cache} ${route.path}: FAIL ${sample.error}`,
            );
          }
          report.samples.push(sample);
          await save();
        }
        await context.close();
      }
    }
  }
  report.finishedAt = new Date().toISOString();
  if (values.baseline)
    report.comparison = compare(JSON.parse(await readFile(values.baseline, "utf8")), report);
  await save();
  if (
    report.samples.some((sample) => sample.error) ||
    report.comparison?.some((row) => !row.passed)
  )
    process.exitCode = 1;
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}
console.log(`Report: ${output}.md`);
