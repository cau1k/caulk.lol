import { env as workerEnv } from "cloudflare:workers";

export type SiteMetricPoint = {
  timestamp: string;
  requests: number;
  p50Ms: number;
  p95Ms: number;
  avgMs: number;
  errors: number;
};

export type SiteAnalyticsData = {
  generatedAt: string;
  source: "cloudflare" | "demo" | "empty" | "unconfigured" | "error";
  error?: string;
  rangeHours: number;
  bucketMinutes: number;
  totals: {
    requests: number;
    errors: number;
    p95Ms: number;
    avgMs: number;
  };
  points: SiteMetricPoint[];
  network: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
};

export type NetworkNode = {
  route: string;
  requests: number;
  p95Ms: number;
};

export type NetworkEdge = {
  source: string;
  target: string;
  requests: number;
};

type AnalyticsEngineDataPoint = {
  indexes?: string[];
  blobs?: string[];
  doubles?: number[];
};

type AnalyticsEngineDatasetBinding = {
  writeDataPoint(point: AnalyticsEngineDataPoint): void;
};

export type RumMetricPayload = {
  pathname: string;
  referrer?: string;
  durationMs: number;
};

type AnalyticsEnv = {
  SITE_METRICS?: AnalyticsEngineDatasetBinding;
  ANALYTICS_ACCOUNT_ID?: unknown;
  ANALYTICS_API_TOKEN?: unknown;
  ANALYTICS_DATASET?: unknown;
};

type CloudflareRuntime = {
  cloudflare?: {
    env?: AnalyticsEnv;
  };
};

const DATASET_NAME_PATTERN = /^[A-Za-z0-9_]+$/;
const DEFAULT_RANGE_HOURS = 24;
const DEFAULT_BUCKET_MINUTES = 5;
const BOT_USER_AGENT_PATTERN =
  /\b(bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|pingdom|uptimerobot|curl|wget|python-requests|httpx|go-http-client)\b/i;

export function getAnalyticsEnv(request: Request): AnalyticsEnv {
  const runtimeEnv = getRuntimeAnalyticsEnv(request);
  const importedEnv = workerEnv as AnalyticsEnv;

  return {
    SITE_METRICS: runtimeEnv?.SITE_METRICS ?? importedEnv.SITE_METRICS,
    ANALYTICS_ACCOUNT_ID:
      readString(runtimeEnv?.ANALYTICS_ACCOUNT_ID) ??
      readString(importedEnv.ANALYTICS_ACCOUNT_ID) ??
      readString(process.env.ANALYTICS_ACCOUNT_ID),
    ANALYTICS_API_TOKEN:
      readString(runtimeEnv?.ANALYTICS_API_TOKEN) ??
      readString(importedEnv.ANALYTICS_API_TOKEN) ??
      readString(process.env.ANALYTICS_API_TOKEN),
    ANALYTICS_DATASET:
      readString(runtimeEnv?.ANALYTICS_DATASET) ??
      readString(importedEnv.ANALYTICS_DATASET) ??
      readString(process.env.ANALYTICS_DATASET),
  };
}

function getRuntimeAnalyticsEnv(request: Request): AnalyticsEnv | undefined {
  if (!("runtime" in request)) return undefined;
  const runtime = request.runtime as CloudflareRuntime;
  return runtime.cloudflare?.env;
}

export function recordSiteMetric(
  request: Request,
  response: Response,
  durationMs: number,
) {
  const env = getAnalyticsEnv(request);
  const dataset = env?.SITE_METRICS;
  if (!dataset) return;

  const url = new URL(request.url);
  if (!shouldRecordRequest(url, request)) return;

  const pathname = normalizePathname(url.pathname);
  if (!pathname) return;

  const referrer = normalizeReferrer(request, url);
  const status = response.status;
  const statusClass = `${Math.floor(status / 100)}xx`;

  dataset.writeDataPoint({
    indexes: [url.hostname],
    blobs: [pathname, referrer, "SSR", statusClass],
    doubles: [durationMs, status, 1],
  });
}

export function recordRumMetric(request: Request, payload: RumMetricPayload) {
  const env = getAnalyticsEnv(request);
  const dataset = env?.SITE_METRICS;
  if (!dataset) return;
  if (isBotRequest(request)) return;

  const url = new URL(request.url);
  const pathname = normalizePathname(payload.pathname);
  const durationMs = Math.round(payload.durationMs);
  if (!pathname || !Number.isFinite(durationMs) || durationMs <= 0) return;

  dataset.writeDataPoint({
    indexes: [url.hostname],
    blobs: [
      pathname,
      normalizeRumReferrer(payload.referrer, url),
      "RUM",
      "client",
    ],
    doubles: [durationMs, 0, 1],
  });
}

export async function readSiteAnalytics(
  request: Request,
): Promise<SiteAnalyticsData> {
  const env = getAnalyticsEnv(request);
  const generatedAt = new Date().toISOString();
  const accountId = readString(env.ANALYTICS_ACCOUNT_ID);
  const apiToken = readString(env.ANALYTICS_API_TOKEN);
  const dataset = readString(env.ANALYTICS_DATASET);

  if (!accountId || !apiToken || !dataset) {
    return emptySiteAnalytics("unconfigured", generatedAt);
  }

  if (!DATASET_NAME_PATTERN.test(dataset)) {
    return emptySiteAnalytics(
      "error",
      generatedAt,
      "Invalid analytics dataset.",
    );
  }

  const [timeSeries, nodes, edges] = await Promise.all([
    queryAnalyticsEngine(accountId, apiToken, buildTimeSeriesQuery(dataset)),
    queryAnalyticsEngine(accountId, apiToken, buildNetworkNodesQuery(dataset)),
    queryAnalyticsEngine(accountId, apiToken, buildNetworkEdgesQuery(dataset)),
  ]);

  if (timeSeries.status !== "ok") {
    return emptySiteAnalytics("error", generatedAt, timeSeries.error);
  }

  const rows = parseAnalyticsRows(timeSeries.payload);
  if (rows.length === 0) {
    return {
      ...emptySiteAnalytics("empty", generatedAt),
      network: {
        nodes: parseNetworkNodes(nodes.payload),
        edges: parseNetworkEdges(edges.payload),
      },
    };
  }

  const totals = rows.reduce(
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
    source: "cloudflare",
    rangeHours: DEFAULT_RANGE_HOURS,
    bucketMinutes: DEFAULT_BUCKET_MINUTES,
    totals: {
      ...totals,
      avgMs: totals.requests > 0 ? totals.avgMs / totals.requests : 0,
    },
    points: rows,
    network: {
      nodes: parseNetworkNodes(nodes.payload),
      edges: parseNetworkEdges(edges.payload),
    },
  };
}

async function queryAnalyticsEngine(
  accountId: string,
  apiToken: string,
  sql: string,
): Promise<
  | { status: "ok"; payload: unknown }
  | { status: "error"; error: string; payload?: never }
> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: sql,
    },
  );

  if (!response.ok) {
    return {
      status: "error",
      error: `Analytics query failed with HTTP ${response.status}.`,
    };
  }

  return { status: "ok", payload: await response.json() };
}

function shouldRecordRequest(url: URL, request: Request) {
  if (request.method !== "GET") return false;
  if (isBotRequest(request)) return false;
  if (!isHtmlNavigation(request)) return false;
  if (url.pathname === "/analytics") return false;
  if (url.pathname.startsWith("/assets/")) return false;
  if (url.pathname.startsWith("/fonts/")) return false;
  if (url.pathname.startsWith("/media/")) return false;
  if (url.pathname.startsWith("/cdn-cgi/")) return false;
  return true;
}

function isHtmlNavigation(request: Request) {
  const accept = request.headers.get("accept");
  return !accept || accept.includes("text/html");
}

function isBotRequest(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || BOT_USER_AGENT_PATTERN.test(userAgent)) return true;

  const cf = "cf" in request ? request.cf : undefined;
  if (!isRecord(cf)) return false;

  const botManagement = cf.botManagement;
  if (!isRecord(botManagement)) return false;

  if (botManagement.verifiedBot === true) return true;
  const score = readNumber(botManagement.score);
  return score > 0 && score < 30;
}

function normalizePathname(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname === "/posts" || pathname === "/posts/") return "/posts";
  if (pathname.startsWith("/posts/tags/")) return "/posts/tags/:tag";
  if (pathname.startsWith("/posts/")) return "/posts/:slug";
  if (pathname === "/about" || pathname === "/about/") return "/about";
  return undefined;
}

function normalizeReferrer(request: Request, url: URL) {
  const referrer = request.headers.get("referer");
  if (!referrer) return "";

  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.hostname !== url.hostname) return "";
    return normalizePathname(referrerUrl.pathname) ?? "";
  } catch {
    return "";
  }
}

function normalizeRumReferrer(referrer: string | undefined, url: URL) {
  if (!referrer) return "";

  try {
    const referrerUrl = new URL(referrer, url.origin);
    if (referrerUrl.hostname !== url.hostname) return "";
    return normalizePathname(referrerUrl.pathname) ?? "";
  } catch {
    return "";
  }
}

function buildTimeSeriesQuery(dataset: string) {
  return `
SELECT
  intDiv(toUInt32(timestamp), ${DEFAULT_BUCKET_MINUTES * 60}) * ${DEFAULT_BUCKET_MINUTES * 60} AS t,
  SUM(_sample_interval) AS requests,
  QUANTILEEXACTWEIGHTED(0.5)(double1, _sample_interval) AS p50_ms,
  QUANTILEEXACTWEIGHTED(0.95)(double1, _sample_interval) AS p95_ms,
  SUM(_sample_interval * double1) / SUM(_sample_interval) AS avg_ms,
  SUM(if(double2 >= 500, _sample_interval, 0)) AS errors
FROM ${dataset}
WHERE timestamp >= NOW() - INTERVAL '${DEFAULT_RANGE_HOURS}' HOUR
  AND blob3 = 'RUM'
GROUP BY t
ORDER BY t ASC
FORMAT JSON
`.trim();
}

function buildNetworkNodesQuery(dataset: string) {
  return `
SELECT
  blob1 AS route,
  SUM(_sample_interval) AS requests,
  QUANTILEEXACTWEIGHTED(0.95)(double1, _sample_interval) AS p95_ms
FROM ${dataset}
WHERE timestamp >= NOW() - INTERVAL '${DEFAULT_RANGE_HOURS}' HOUR
  AND blob3 = 'RUM'
GROUP BY route
ORDER BY requests DESC
LIMIT 16
FORMAT JSON
`.trim();
}

function buildNetworkEdgesQuery(dataset: string) {
  return `
SELECT
  blob2 AS source,
  blob1 AS target,
  SUM(_sample_interval) AS requests
FROM ${dataset}
WHERE timestamp >= NOW() - INTERVAL '${DEFAULT_RANGE_HOURS}' HOUR
  AND blob3 = 'RUM'
  AND blob2 != ''
  AND blob2 != blob1
GROUP BY source, target
ORDER BY requests DESC
LIMIT 24
FORMAT JSON
`.trim();
}

function parseAnalyticsRows(payload: unknown): SiteMetricPoint[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  return payload.data.flatMap((row) => {
    if (!isRecord(row)) return [];
    const unixSeconds = readNumber(row.t);
    if (!Number.isFinite(unixSeconds)) return [];

    return [
      {
        timestamp: new Date(unixSeconds * 1000).toISOString(),
        requests: readNumber(row.requests),
        p50Ms: readNumber(row.p50_ms),
        p95Ms: readNumber(row.p95_ms),
        avgMs: readNumber(row.avg_ms),
        errors: readNumber(row.errors),
      },
    ];
  });
}

function parseNetworkNodes(payload: unknown): NetworkNode[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  return payload.data.flatMap((row) => {
    if (!isRecord(row) || typeof row.route !== "string") return [];

    return [
      {
        route: row.route,
        requests: readNumber(row.requests),
        p95Ms: readNumber(row.p95_ms),
      },
    ];
  });
}

function parseNetworkEdges(payload: unknown): NetworkEdge[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  return payload.data.flatMap((row) => {
    if (
      !isRecord(row) ||
      typeof row.source !== "string" ||
      typeof row.target !== "string"
    ) {
      return [];
    }

    return [
      {
        source: row.source,
        target: row.target,
        requests: readNumber(row.requests),
      },
    ];
  });
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function emptySiteAnalytics(
  source: SiteAnalyticsData["source"],
  generatedAt: string,
  error?: string,
): SiteAnalyticsData {
  return {
    generatedAt,
    source,
    error,
    rangeHours: DEFAULT_RANGE_HOURS,
    bucketMinutes: DEFAULT_BUCKET_MINUTES,
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
