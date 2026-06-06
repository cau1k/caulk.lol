import type {
  SiteAnalyticsData,
  SiteMetricPoint,
} from "@/lib/analytics-engine";

const DEFAULT_RANGE_HOURS = 24;
const DEFAULT_BUCKET_MINUTES = 5;

export function demoSiteAnalytics(generatedAt = new Date().toISOString()) {
  const bucketMs = DEFAULT_BUCKET_MINUTES * 60 * 1000;
  const end = Math.floor(Date.now() / bucketMs) * bucketMs;
  const routeSeeds = ["/", "/posts", "/posts/:slug", "/notes", "/about"];
  const points = Array.from({ length: 24 }, (_, index): SiteMetricPoint => {
    const wave = Math.sin(index / 2.4) * 18;
    const burst = index > 14 && index < 19 ? 34 : 0;
    const requests = Math.max(4, Math.round(18 + wave + burst + index * 0.8));
    const p50Ms = Math.max(18, Math.round(42 + Math.cos(index / 2) * 9));
    const p95Ms = Math.round(p50Ms * 2.1 + 18 + burst * 1.4);

    return {
      timestamp: new Date(end - (23 - index) * bucketMs).toISOString(),
      requests,
      p50Ms,
      p95Ms,
      avgMs: Math.round((p50Ms + p95Ms) / 2.7),
      errors: index === 17 ? 1 : 0,
    };
  });
  const totals = points.reduce(
    (acc, point) => {
      acc.requests += point.requests;
      acc.errors += point.errors;
      acc.avgMs += point.avgMs * point.requests;
      acc.p95Ms = Math.max(acc.p95Ms, point.p95Ms);
      return acc;
    },
    { requests: 0, errors: 0, p95Ms: 0, avgMs: 0 },
  );

  return {
    generatedAt,
    source: "demo",
    rangeHours: DEFAULT_RANGE_HOURS,
    bucketMinutes: DEFAULT_BUCKET_MINUTES,
    totals: {
      ...totals,
      avgMs: totals.requests > 0 ? totals.avgMs / totals.requests : 0,
    },
    points,
    network: {
      nodes: routeSeeds.map((route, index) => ({
        route,
        requests: [260, 184, 151, 94, 71][index] ?? 20,
        p95Ms: [88, 121, 173, 96, 64][index] ?? 80,
      })),
      edges: [
        { source: "/", target: "/posts", requests: 64 },
        { source: "/posts", target: "/posts/:slug", requests: 92 },
        { source: "/posts/:slug", target: "/posts", requests: 38 },
        { source: "/", target: "/about", requests: 24 },
        { source: "/", target: "/notes", requests: 31 },
        { source: "/notes", target: "/posts/:slug", requests: 12 },
      ],
    },
  } satisfies SiteAnalyticsData;
}
