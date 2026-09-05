#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compare, summarize } from "./report.mjs";

const chartFiles = {
  localCold: "assets/local-cold-dark.png",
  localWarm: "assets/local-warm-dark.png",
  liveCold: "assets/live-cold-dark.png",
  liveWarm: "assets/live-warm-dark.png",
};

const lightChartFiles = {
  localCold: "assets/local-cold-light.png",
  localWarm: "assets/local-warm-light.png",
  liveCold: "assets/live-cold-light.png",
  liveWarm: "assets/live-warm-light.png",
};

const baselineNote =
  "The baseline retains all 240 timed samples from the first three complete, balanced rounds, including the Analytics errors described below. Later rounds had a readiness timeout and a local workerd abort; the full original run remains preserved separately.";
const acceptanceNote =
  "The final scope accepts measured improvements with every missed 3× target documented. The original per-cell load-and-readiness gate remains unchanged in the results.";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseline = await readJson(args.baseline, "baseline");
  const candidate = await readJson(args.candidate, "candidate");
  normalizeReport(baseline);
  normalizeReport(candidate);
  assertComparable(baseline, candidate);

  const rows = buildRows(baseline, candidate);
  assertCandidateHealthy(rows);
  const data = {
    schemaVersion: 1,
    metadata: metadata(baseline, candidate),
    rows,
    overview: overview(rows),
    misses: rows.filter((row) => !row.passed),
    charts: charts(rows),
    notes: {
      baseline: baselineNote,
      acceptance: acceptanceNote,
      baselineErrors: errorSummary(baseline.samples ?? []),
      chartImages: chartFiles,
      chartLightVariants: lightChartFiles,
      deploymentAndFeatureProof: args.notes
        ? await readFile(args.notes, "utf8")
        : "Deployment and feature verification were not supplied to this timing export.",
    },
  };

  await writeJson(args.data, data);
  await writeText(args.report, markdown(data));
  console.log(`wrote ${args.data}`);
  console.log(`wrote ${args.report}`);
}

function parseArgs(argv) {
  const args = {
    data: "apps/blog/src/generated/performance.json",
    report: "docs/performance/2026-09-05.md",
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag?.startsWith("--") || value == null) usage();
    if (flag === "--baseline") args.baseline = value;
    else if (flag === "--candidate") args.candidate = value;
    else if (flag === "--data") args.data = value;
    else if (flag === "--report") args.report = value;
    else if (flag === "--notes") args.notes = value;
    else usage();
  }
  if (!args.baseline || !args.candidate) usage();
  return args;
}

function usage() {
  throw new Error(
    "Usage: node scripts/performance/export.mjs --baseline baseline.json --candidate candidate.json [--data apps/blog/src/generated/performance.json] [--report docs/performance/2026-09-05.md] [--notes verification.md]",
  );
}

async function readJson(file, label) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${label} report ${file}: ${error.message}`);
  }
}

function normalizeReport(report) {
  report.summary = summarize(report.samples ?? []);
}

function assertComparable(baseline, candidate) {
  compare(baseline, candidate);
  const baselineKeys = new Set(baseline.summary.map(cellKey));
  const candidateKeys = new Set(candidate.summary.map(cellKey));
  const missing = [...baselineKeys].filter((key) => !candidateKeys.has(key));
  const extra = [...candidateKeys].filter((key) => !baselineKeys.has(key));
  if (missing.length || extra.length) {
    throw new Error(
      [
        "Candidate and baseline cells differ.",
        missing.length ? `Missing candidate cells: ${missing.join(", ")}` : null,
        extra.length ? `Extra candidate cells: ${extra.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function assertCandidateHealthy(rows) {
  const weakCounts = rows.filter((row) => row.candidate.count < row.baseline.count);
  const failures = rows.filter((row) => row.candidate.errors > 0);
  if (!weakCounts.length && !failures.length) return;
  throw new Error(
    [
      "Candidate run is not healthy enough to export.",
      weakCounts.length
        ? `Candidate count below baseline: ${weakCounts.map((row) => `${row.id} ${row.candidate.count}<${row.baseline.count}`).join(", ")}`
        : null,
      failures.length
        ? `Candidate failures: ${failures.map((row) => `${row.id} errors=${row.candidate.errors}`).join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function buildRows(baseline, candidate) {
  const current = new Map(candidate.summary.map((row) => [cellKey(row), row]));
  const comparisons = new Map(compare(baseline, candidate).map((row) => [row.id, row]));
  return baseline.summary
    .map((before) =>
      rowFrom(before, current.get(cellKey(before)), comparisons.get(cellKey(before))),
    )
    .sort((a, b) =>
      `${a.origin}|${a.cache}|${a.path}`.localeCompare(`${b.origin}|${b.cache}|${b.path}`),
    );
}

function rowFrom(before, after, comparison) {
  const ratios = {
    load: ratio(before.loadMs, after.loadMs),
    ready: ratio(before.readyMs, after.readyMs),
    fcp: ratio(before.fcpMs, after.fcpMs),
    lcp: ratio(before.lcpMs, after.lcpMs),
  };
  return {
    id: cellKey(before),
    path: before.path,
    origin: before.target,
    cache: before.cache,
    baseline: metricSet(before),
    candidate: metricSet(after),
    ratios,
    passed: comparison.passed,
    errors: {
      baseline: before.failures,
      candidate: after.failures,
    },
  };
}

function metricSet(row) {
  return {
    count: row.count,
    errors: row.failures,
    meanLoadMs: mean(row.loadMs),
    meanReadyMs: mean(row.readyMs),
    meanFcpMs: mean(row.fcpMs),
    meanLcpMs: mean(row.lcpMs),
    meanTransferBytes: mean(row.transferBytes),
  };
}

function metadata(baseline, candidate) {
  return {
    exportedAt: new Date().toISOString(),
    baseline: runMetadata(baseline),
    candidate: runMetadata(candidate),
    harnessHash: baseline.harnessHash,
    browser: baseline.browser,
    profile: baseline.profile,
    rounds: {
      baseline: baseline.runs,
      candidate: candidate.runs,
    },
  };
}

function runMetadata(report) {
  return {
    label: stringValue(report.label),
    revision: stringValue(report.revision),
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    browser: stringValue(report.browser),
    profile: report.profile,
    sampleCount: report.samples?.length ?? 0,
    cellCount: report.summary.length,
    rounds: report.runs,
    harnessHash: stringValue(report.harnessHash),
    dirty: report.dirty,
  };
}

function overview(rows) {
  const byGroup = Map.groupBy(rows, (row) => `${row.origin}|${row.cache}`);
  return Object.fromEntries(
    [...byGroup].map(([key, group]) => [
      scopeKey(key),
      {
        pages: group.length,
        passed: group.filter((row) => row.passed).length,
        missed: group.filter((row) => !row.passed).length,
        arithmeticMeanLoadRatio: average(group.map((row) => row.ratios.load)),
        arithmeticMeanReadyRatio: average(group.map((row) => row.ratios.ready)),
      },
    ]),
  );
}

function charts(rows) {
  return Object.fromEntries(
    Object.keys(chartFiles).map((key) => {
      const { origin, cache } = parseScopeKey(key);
      return [
        key,
        rows
          .filter((row) => row.origin === origin && row.cache === cache)
          .map((row) => ({
            label: row.path,
            baselineMs: row.baseline.meanLoadMs,
            candidateMs: row.candidate.meanLoadMs,
          })),
      ];
    }),
  );
}

function scopeKey(key) {
  const [origin, cache] = key.split("|");
  return `${origin}${cache[0].toUpperCase()}${cache.slice(1)}`;
}

function parseScopeKey(key) {
  const match = /^(local|live)(Cold|Warm)$/.exec(key);
  if (!match) throw new Error(`Unknown chart scope: ${key}`);
  return { origin: match[1], cache: match[2].toLowerCase() };
}

function markdown(data) {
  const lines = [
    "# caulk.lol public page performance report — 2026-09-05",
    "",
    `Baseline: ${data.metadata.baseline.revision} (${data.metadata.baseline.label})`,
    `Candidate: ${data.metadata.candidate.revision} (${data.metadata.candidate.label})`,
    `Browser: ${data.metadata.browser}. Harness: ${data.metadata.harnessHash}.`,
    "",
    data.notes.deploymentAndFeatureProof,
    "",
    "## Methodology",
    "",
    "The runner measures every public page as paired local and live browser navigations, with cold and warm browser cache cells. Cold means empty browser cache and storage for that browser context. It does not prove a cold Cloudflare edge cache; CDN cache state stays visible in response headers and should be interpreted separately.",
    "",
    `Profile: ${profileText(data.metadata.profile)}. Baseline rounds: ${data.metadata.rounds.baseline}. Candidate rounds: ${data.metadata.rounds.candidate}.`,
    "",
    "Load is the browser navigation load event. Ready is stricter: the maximum of load, observed LCP, app hydration, and route readiness markers such as the theme control being hydrated. Errors stay errors and never become fast samples.",
    "",
    baselineNote,
    acceptanceNote,
    baselineErrorLine(data.notes.baselineErrors),
    "",
    "## Chart exports",
    "",
    "![Local cold](assets/local-cold-dark.png)",
    "![Local warm](assets/local-warm-dark.png)",
    "![Live cold](assets/live-cold-dark.png)",
    "![Live warm](assets/live-warm-dark.png)",
    "",
    "Light variants: [local cold](assets/local-cold-light.png), [local warm](assets/local-warm-light.png), [live cold](assets/live-cold-light.png), [live warm](assets/live-warm-light.png).",
    "",
    "## Equal-page overview",
    "",
    "These overview ratios are arithmetic means across pages, with equal page weight. The gate still applies to every page/origin/cache cell independently.",
    "",
    "| Scope | Pages | Passed | Missed | Mean load ratio | Mean ready ratio |",
    "|---|---:|---:|---:|---:|---:|",
    ...Object.entries(data.overview).map(
      ([scope, row]) =>
        `| ${scope} | ${row.pages} | ${row.passed} | ${row.missed} | ${fmtRatio(row.arithmeticMeanLoadRatio)} | ${fmtRatio(row.arithmeticMeanReadyRatio)} |`,
    ),
    "",
    "## Explicit misses",
    "",
    ...missLines(data.misses),
    "",
    "## All cells",
    "",
    "| Origin | Cache | Page | n/errors | Load before | Load after | Load ratio | Ready before | Ready after | Ready ratio | FCP ratio | LCP ratio | Gate |",
    "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
    ...data.rows.map(tableRow),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function errorSummary(samples) {
  const errors = samples.filter((sample) => sample.error);
  const byMessage = new Map();
  for (const sample of errors) {
    const message = sample.error.replace(/\s+/g, " ").trim();
    const item = byMessage.get(message) ?? { message, count: 0, cells: new Set() };
    item.count += 1;
    item.cells.add(`${sample.target}|${sample.path}|${sample.cache}`);
    byMessage.set(message, item);
  }
  return [...byMessage.values()].map((item) => ({
    message: item.message,
    count: item.count,
    cells: [...item.cells].sort(),
  }));
}

function baselineErrorLine(errors) {
  if (!errors.length) return "Baseline browser errors: none.";
  return `Baseline browser errors were preserved, not hidden: ${errors
    .map((error) => `${error.count} samples across ${error.cells.length} cells: ${error.message}`)
    .join("; ")}.`;
}

function profileText(profile) {
  return [
    `${profile.viewport?.width}x${profile.viewport?.height}`,
    `${profile.colorScheme} mode`,
    `${profile.cpuRate}x CPU throttle`,
    `${profile.latencyMs} ms latency`,
    `${Math.round((profile.downloadBytesPerSecond ?? 0) / 1000)} KB/s down`,
    `${Math.round((profile.uploadBytesPerSecond ?? 0) / 1000)} KB/s up`,
    profile.networkRule,
  ].join(", ");
}

function stringValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function missLines(misses) {
  if (!misses.length) return ["All cells passed the 3× load and ready gate."];
  return misses.map(
    (row) =>
      `- ${row.origin} ${row.cache} ${row.path}: load ${fmtRatio(row.ratios.load)}, ready ${fmtRatio(row.ratios.ready)}.`,
  );
}

function tableRow(row) {
  return `| ${row.origin} | ${row.cache} | ${row.path} | ${row.candidate.count}/${row.candidate.errors} | ${fmtMs(row.baseline.meanLoadMs)} | ${fmtMs(row.candidate.meanLoadMs)} | ${fmtRatio(row.ratios.load)} | ${fmtMs(row.baseline.meanReadyMs)} | ${fmtMs(row.candidate.meanReadyMs)} | ${fmtRatio(row.ratios.ready)} | ${fmtRatio(row.ratios.fcp)} | ${fmtRatio(row.ratios.lcp)} | ${row.passed ? "pass" : "FAIL"} |`;
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeText(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

function cellKey(row) {
  return `${row.target}|${row.path}|${row.cache}`;
}

function ratio(before, after) {
  return before?.mean && after?.mean ? before.mean / after.mean : null;
}

function mean(metric) {
  return metric?.mean ?? null;
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function fmtMs(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function fmtRatio(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}×` : "—";
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
