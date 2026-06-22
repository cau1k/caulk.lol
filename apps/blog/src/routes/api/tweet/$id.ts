import { resolveTweetEmbed } from "@caulk.lol/api/link-preview";
import { createFileRoute } from "@tanstack/react-router";
import { getLinkPreviewCache } from "@/lib/link-preview-cache";

const tweetIdPattern = /^\d{1,32}$/;

export const Route = createFileRoute("/api/tweet/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!tweetIdPattern.test(params.id)) {
          return jsonResponse(
            { data: null, error: "Invalid tweet id" },
            { status: 400 },
          );
        }

        try {
          const result = await resolveTweetEmbed(params.id, {
            cache: getLinkPreviewCache(request),
          });

          return jsonResponse(result, {
            headers: {
              "Cache-Control":
                result.source === "live"
                  ? "public, max-age=300, s-maxage=300"
                  : "public, max-age=3600, s-maxage=86400",
            },
          });
        } catch (error) {
          return jsonResponse(
            { data: null, error: errorMessage(error) },
            { status: 502 },
          );
        }
      },
    },
  },
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
