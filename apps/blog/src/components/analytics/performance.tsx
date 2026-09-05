"use client";

import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";

export type PerformanceComparisonRow = {
  label: string;
  baselineMs: number;
  candidateMs: number;
};

type ChartRow = PerformanceComparisonRow & {
  indexLabel: string;
  improvement: number;
};

const comparisonConfig = {
  baselineMs: { label: "baseline", color: "primaryMuted" },
  candidateMs: { label: "candidate", color: "primary" },
} as const;

export function PerformanceComparisonChart({
  rows,
}: {
  rows: PerformanceComparisonRow[];
}) {
  const chartRows = rows.map((row, index) => ({
    ...row,
    indexLabel: String(index + 1),
    improvement: row.baselineMs > 0 ? row.baselineMs / row.candidateMs : 0,
  }));
  const summary = summarize(chartRows);

  if (chartRows.length === 0) {
    return (
      <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
        Performance comparison data is pending.
      </p>
    );
  }

  return (
    <figure className="not-prose w-full max-w-full space-y-4">
      <figcaption className="space-y-2">
        <p className="text-sm text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <LegendSwatch className="bg-primary/60" label="baseline" />
          <LegendSwatch className="bg-primary" label="candidate" />
        </div>
      </figcaption>

      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
        <div
          className="h-[520px] w-full min-w-0"
          role="img"
          aria-label={summary}
        >
          <BarChart
            animate={false}
            bloom="off"
            config={comparisonConfig}
            data={chartRows}
            margins={{ bottom: 34, left: 54, right: 16, top: 12 }}
          >
            <Grid />
            <XAxis dataKey="indexLabel" maxTicks={chartRows.length} />
            <YAxis tickFormatter={formatMs} />
            <Tooltip labelKey="label" valueFormatter={formatMs} />
            <Bar dataKey="baselineMs" variant="hatched" />
            <Bar dataKey="candidateMs" variant="gradient" />
          </BarChart>
        </div>
      </div>

      <ol className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
        {chartRows.map((row) => (
          <li key={row.label} className="min-w-0 font-mono tabular-nums">
            <span className="text-foreground">{row.indexLabel}.</span>{" "}
            <span className="break-all">{row.label}</span>{" "}
            <span className="whitespace-nowrap text-foreground">
              {formatMs(row.baselineMs)} → {formatMs(row.candidateMs)}
            </span>
          </li>
        ))}
      </ol>

      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">Page</th>
            <th scope="col">Baseline</th>
            <th scope="col">Candidate</th>
            <th scope="col">Improvement</th>
          </tr>
        </thead>
        <tbody>
          {chartRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{formatMs(row.baselineMs)}</td>
              <td>{formatMs(row.candidateMs)}</td>
              <td>{formatRatio(row.improvement)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function summarize(rows: ChartRow[]) {
  if (rows.length === 0) return "Performance comparison data is pending.";

  return `Performance comparison chart for ${rows.length} pages. Average baseline ${formatMs(average(rows.map((row) => row.baselineMs)))}, average candidate ${formatMs(average(rows.map((row) => row.candidateMs)))}.`;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "n/a";
  return `${value.toFixed(1)}x`;
}

function formatMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}
