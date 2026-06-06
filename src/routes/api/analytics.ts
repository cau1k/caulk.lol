import { createFileRoute } from "@tanstack/react-router";
import { readSiteAnalytics } from "@/lib/analytics-engine";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const analytics = await readSiteAnalytics(request);
        return jsonResponse(analytics, {
          headers: {
            "Cache-Control":
              "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
