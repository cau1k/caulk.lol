import { createFileRoute } from "@tanstack/react-router";
import { Activity, Clock, Gauge, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { HomeLayout } from "@/components/layout/home";
import type {
  NetworkEdge,
  NetworkNode,
  SiteAnalyticsData,
  SiteMetricPoint,
} from "@/lib/analytics-engine";
import { emptySiteAnalytics } from "@/lib/analytics-engine";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/analytics")({
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<SiteAnalyticsData>(() =>
    emptySiteAnalytics("empty", new Date().toISOString()),
  );
  const [isLoading, setIsLoading] = useState(true);
  const hasData = analytics.points.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const response = await fetch("/api/analytics");
        const nextAnalytics = (await response.json()) as SiteAnalyticsData;
        if (!cancelled) setAnalytics(nextAnalytics);
      } catch (error) {
        if (cancelled) return;
        setAnalytics(
          emptySiteAnalytics(
            "error",
            new Date().toISOString(),
            error instanceof Error
              ? error.message
              : "Failed to load analytics.",
          ),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              public worker telemetry
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            last {analytics.rangeHours}h · {analytics.bucketMinutes}m buckets
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            icon={Activity}
            label="Requests"
            value={formatCount(analytics.totals.requests)}
          />
          <Metric
            icon={Gauge}
            label="p95 latency"
            value={formatMs(analytics.totals.p95Ms)}
          />
          <Metric
            icon={Clock}
            label="Average"
            value={formatMs(analytics.totals.avgMs)}
          />
          <Metric
            icon={TriangleAlert}
            label="5xx"
            value={formatCount(analytics.totals.errors)}
          />
        </section>

        <section className="mt-8 border border-border bg-background/70 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium">Latency over time</h2>
              <p className="text-sm text-muted-foreground">
                p50 and p95 response timing from Workers Analytics Engine
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Legend color="bg-primary" label="p95" />
              <Legend color="bg-foreground/70" label="p50" />
            </div>
          </div>

          {hasData ? (
            <LatencyChart points={analytics.points} />
          ) : (
            <div className="flex min-h-72 items-center justify-center border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              {isLoading
                ? "Loading Analytics Engine data..."
                : (analytics.error ??
                  "Waiting for Analytics Engine data. The dataset is created after production traffic writes its first point.")}
            </div>
          )}
        </section>

        <section className="mt-8 border border-border bg-background/70 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-6">
            <h2 className="font-medium">Route network</h2>
            <p className="text-sm text-muted-foreground">
              same-origin referrer flow for real browser page requests
            </p>
          </div>

          {analytics.network.nodes.length > 0 ? (
            <NetworkGraph
              nodes={analytics.network.nodes}
              edges={analytics.network.edges}
            />
          ) : (
            <div className="flex min-h-72 items-center justify-center border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              Network flow appears after visitors move between pages with a
              same-origin referrer.
            </div>
          )}
        </section>

        <p className="mt-4 text-xs text-muted-foreground">
          source: {analytics.source} · generated{" "}
          {new Date(analytics.generatedAt).toLocaleString()}
        </p>
      </main>
    </HomeLayout>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-border bg-background/70 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="font-mono text-2xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("size-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function LatencyChart({ points }: { points: SiteMetricPoint[] }) {
  const width = 960;
  const height = 320;
  const padding = { top: 16, right: 18, bottom: 34, left: 48 };
  const maxLatency = Math.max(...points.map((point) => point.p95Ms), 1);
  const maxRequests = Math.max(...points.map((point) => point.requests), 1);
  const xSpan = Math.max(points.length - 1, 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yTicks = makeTicks(maxLatency);
  const requestBars = points.map((point, index) => {
    const x = padding.left + (index / xSpan) * plotWidth;
    const barHeight = (point.requests / maxRequests) * (plotHeight * 0.28);
    return {
      x,
      y: padding.top + plotHeight - barHeight,
      height: barHeight,
    };
  });
  const p95Path = linePath(points, (point) => point.p95Ms);
  const p50Path = linePath(points, (point) => point.p50Ms);

  function linePath(
    chartPoints: SiteMetricPoint[],
    getValue: (point: SiteMetricPoint) => number,
  ) {
    return chartPoints
      .map((point, index) => {
        const x = padding.left + (index / xSpan) * plotWidth;
        const y =
          padding.top +
          plotHeight -
          (getValue(point) / maxLatency) * plotHeight;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Site latency time series"
        viewBox={`0 0 ${width} ${height}`}
        className="min-h-72 w-full min-w-[720px]"
      >
        <title>Site latency time series</title>
        {yTicks.map((tick) => {
          const y = padding.top + plotHeight - (tick / maxLatency) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="stroke-border"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {formatMs(tick)}
              </text>
            </g>
          );
        })}

        {requestBars.map((bar, index) => (
          <rect
            key={`${points[index]?.timestamp}-${index}`}
            x={bar.x - 2}
            y={bar.y}
            width={4}
            height={bar.height}
            className="fill-muted-foreground/20"
          />
        ))}

        <path
          d={p95Path}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
        />
        <path
          d={p50Path}
          fill="none"
          className="stroke-foreground/70"
          strokeWidth="2"
        />

        {points.map((point, index) => {
          const x = padding.left + (index / xSpan) * plotWidth;
          if (index !== 0 && index !== points.length - 1) return null;
          return (
            <text
              key={point.timestamp}
              x={x}
              y={height - 8}
              textAnchor={index === 0 ? "start" : "end"}
              className="fill-muted-foreground text-[11px]"
            >
              {formatTime(point.timestamp)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function NetworkGraph({
  nodes,
  edges,
}: {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}) {
  const width = 860;
  const height = 360;
  const center = { x: width / 2, y: height / 2 };
  const maxRequests = Math.max(...nodes.map((node) => node.requests), 1);
  const nodePositions = new Map<string, { x: number; y: number }>();
  const radius = 126;

  nodes.forEach((node, index) => {
    const angle =
      (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;
    nodePositions.set(node.route, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Route network graph"
        viewBox={`0 0 ${width} ${height}`}
        className="min-h-72 w-full min-w-[700px]"
      >
        <title>Route network graph</title>
        {edges.map((edge) => {
          const source = nodePositions.get(edge.source);
          const target = nodePositions.get(edge.target);
          if (!source || !target) return null;

          return (
            <g key={`${edge.source}->${edge.target}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="stroke-border"
                strokeWidth={Math.max(1, Math.min(edge.requests, 8))}
              />
              <circle
                cx={target.x}
                cy={target.y}
                r="3"
                className="fill-primary"
              />
            </g>
          );
        })}

        {nodes.map((node) => {
          const position = nodePositions.get(node.route);
          if (!position) return null;
          const nodeRadius = 10 + (node.requests / maxRequests) * 18;

          return (
            <g key={node.route}>
              <circle
                cx={position.x}
                cy={position.y}
                r={nodeRadius}
                className="fill-background stroke-primary"
                strokeWidth="2"
              />
              <text
                x={position.x}
                y={position.y + nodeRadius + 18}
                textAnchor="middle"
                className="fill-foreground text-[12px]"
              >
                {node.route}
              </text>
              <text
                x={position.x}
                y={position.y + nodeRadius + 34}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {formatCount(node.requests)} · p95 {formatMs(node.p95Ms)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function makeTicks(max: number) {
  const top = niceCeil(max);
  return [0, top / 2, top];
}

function niceCeil(value: number) {
  if (value <= 100) return 100;
  if (value <= 250) return 250;
  if (value <= 500) return 500;
  if (value <= 1000) return 1000;
  return Math.ceil(value / 1000) * 1000;
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
