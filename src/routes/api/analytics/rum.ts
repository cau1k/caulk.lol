import { createFileRoute } from "@tanstack/react-router";
import { type RumMetricPayload, recordRumMetric } from "@/lib/analytics-engine";

function emptyResponse(init?: ResponseInit) {
  return new Response(null, {
    status: 204,
    ...init,
  });
}

export const Route = createFileRoute("/api/analytics/rum")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) return emptyResponse();

        const body = await request.json();
        if (!isRumMetricPayload(body)) return emptyResponse();

        recordRumMetric(request, body);
        return emptyResponse();
      },
    },
  },
});

function isRumMetricPayload(value: unknown): value is RumMetricPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<RumMetricPayload>;
  return (
    typeof candidate.pathname === "string" &&
    candidate.pathname.startsWith("/") &&
    typeof candidate.durationMs === "number" &&
    Number.isFinite(candidate.durationMs) &&
    (candidate.referrer === undefined || typeof candidate.referrer === "string")
  );
}
