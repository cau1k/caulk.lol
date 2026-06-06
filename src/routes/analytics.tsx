import { createFileRoute } from "@tanstack/react-router";
import { Activity, Clock, Gauge, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyChartState, LatencyChart, NetworkGraph } from "@/components/analytics/charts";
import { HomeLayout } from "@/components/layout/home";
import type { SiteAnalyticsData } from "@/lib/analytics-engine";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/analytics")({
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<SiteAnalyticsData>(() =>
    createEmptySiteAnalytics("empty", new Date().toISOString()),
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
          createEmptySiteAnalytics(
            "error",
            new Date().toISOString(),
            error instanceof Error ? error.message : "Failed to load analytics.",
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
            <p className="mb-3 text-sm text-muted-foreground">public worker telemetry</p>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            last {analytics.rangeHours}h · {analytics.bucketMinutes}m buckets
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Activity} label="Requests" value={formatCount(analytics.totals.requests)} />
          <Metric icon={Gauge} label="p95 latency" value={formatMs(analytics.totals.p95Ms)} />
          <Metric icon={Clock} label="Average" value={formatMs(analytics.totals.avgMs)} />
          <Metric icon={TriangleAlert} label="5xx" value={formatCount(analytics.totals.errors)} />
        </section>

        <section className="mt-8 border border-border bg-background/70 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium">Latency over time</h2>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Legend color="bg-chart-1" label="p95" />
              <Legend color="bg-chart-3" label="p50" />
            </div>
          </div>

          {hasData ? (
            <LatencyChart points={analytics.points} />
          ) : (
            <EmptyChartState
              message={
                isLoading
                  ? "Loading Analytics Engine data..."
                  : (analytics.error ??
                    "Waiting for Analytics Engine data. The dataset is created after production traffic writes its first point.")
              }
            />
          )}
        </section>

        <section className="mt-8 border border-border bg-background/70 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-6">
            <h2 className="font-medium">Route network</h2>
          </div>

          {analytics.network.nodes.length > 0 ? (
            <NetworkGraph nodes={analytics.network.nodes} edges={analytics.network.edges} />
          ) : (
            <EmptyChartState message="Network flow appears after visitors move between pages with a same-origin referrer." />
          )}
        </section>

        <p className="mt-4 text-xs text-muted-foreground">
          source: {analytics.source} · generated {new Date(analytics.generatedAt).toLocaleString()}
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
      <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
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

function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

function formatMs(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function createEmptySiteAnalytics(
  source: SiteAnalyticsData["source"],
  generatedAt: string,
  error?: string,
): SiteAnalyticsData {
  return {
    generatedAt,
    source,
    error,
    rangeHours: 24,
    bucketMinutes: 5,
    totals: {
      requests: 0,
      errors: 0,
      p95Ms: 0,
      avgMs: 0,
    },
    points: [],
    network: {
      nodes: [],
      edges: [],
    },
  };
}
