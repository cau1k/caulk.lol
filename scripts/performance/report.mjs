export const metrics = [
  "loadMs",
  "fcpMs",
  "lcpMs",
  "hydrationMs",
  "readyMs",
  "ttfbMs",
  "transferBytes",
];

export function summarize(samples) {
  const groups = Map.groupBy(
    samples,
    (sample) => `${sample.target}|${sample.path}|${sample.cache}`,
  );
  return [...groups.values()].map((group) => {
    const valid = group.filter((sample) => Number.isFinite(sample.loadMs));
    return {
      target: group[0].target,
      path: group[0].path,
      cache: group[0].cache,
      count: group.length,
      failures: group.filter((sample) => sample.error).length,
      ...Object.fromEntries(
        metrics.map((metric) => {
          const values = valid
            .map((sample) => sample[metric])
            .filter(Number.isFinite)
            .sort((a, b) => a - b);
          return [
            metric,
            values.length
              ? {
                  mean: values.reduce((sum, value) => sum + value, 0) / values.length,
                  p50: values[Math.ceil(values.length * 0.5) - 1],
                  p95: values[Math.ceil(values.length * 0.95) - 1],
                  min: values[0],
                  max: values.at(-1),
                }
              : null,
          ];
        }),
      ),
    };
  });
}

/** Every baseline cell must be present, healthy, and meet the target independently. */
export function compare(baseline, current, factor = 3) {
  if (baseline.harnessHash !== current.harnessHash) {
    throw new Error("Measurement code changed; remeasure the preserved baseline build.");
  }
  if (JSON.stringify(baseline.profile) !== JSON.stringify(current.profile)) {
    throw new Error("Benchmark profiles differ; collect comparable measurements.");
  }
  if (baseline.browser !== current.browser) throw new Error("Browser versions differ.");
  const key = (row) => `${row.target}|${row.path}|${row.cache}`;
  const before = new Map(baseline.summary.map((row) => [key(row), row]));
  const after = new Map(current.summary.map((row) => [key(row), row]));
  return [...new Set([...before.keys(), ...after.keys()])].map((id) => {
    const previous = before.get(id);
    const next = after.get(id);
    const ratios = Object.fromEntries(
      ["loadMs", "fcpMs", "lcpMs", "readyMs"].map((metric) => [
        metric,
        previous?.[metric]?.mean && next?.[metric]?.mean
          ? previous[metric].mean / next[metric].mean
          : null,
      ]),
    );
    return {
      id,
      ratios,
      passed: Boolean(
        previous &&
        next &&
        !next.failures &&
        next.count >= previous.count &&
        ratios.loadMs >= factor &&
        ratios.readyMs >= factor,
      ),
    };
  });
}

export function markdown(report) {
  const lines = [
    `# Public page performance: ${report.label}`,
    "",
    `Revision: ${report.revision}. Browser: ${report.browser}. Samples per cell: ${report.runs}.`,
    "",
    "Cold = empty browser cache/storage. Warm = another navigation in that context, with its HTTP cache retained. CDN state is recorded separately; a cold browser does not prove a cold edge cache. No request interception or response mocks are used.",
    "",
    "Times are arithmetic means in milliseconds. Ready = max(load, observed largest content paint, theme control hydration). Errors remain failures; they are never converted into fast samples.",
    "",
    "| Target | Page | Cache | n / errors | Load | FCP | LCP | Hydration | Ready | TTFB | KiB |",
    "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  for (const row of report.summary) {
    lines.push(
      `| ${row.target} | ${row.path} | ${row.cache} | ${row.count} / ${row.failures} | ${metrics.map((metric) => (row[metric] ? (row[metric].mean / (metric === "transferBytes" ? 1024 : 1)).toFixed(1) : "—")).join(" | ")} |`,
    );
  }
  if (report.comparison) {
    lines.push(
      "",
      "## Improvement against baseline",
      "",
      "| Target / page / cache | Load speedup | Ready speedup | ≥3× both |",
      "|---|---:|---:|---|",
    );
    for (const row of report.comparison) {
      lines.push(
        `| ${row.id.replaceAll("|", " · ")} | ${row.ratios.loadMs?.toFixed(2) ?? "—"}× | ${row.ratios.readyMs?.toFixed(2) ?? "—"}× | ${row.passed ? "pass" : "FAIL"} |`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
