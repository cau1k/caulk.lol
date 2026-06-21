import { createFileRoute } from "@tanstack/react-router";
import { getOwnerSession } from "@/lib/auth-guards";
import { updateLink } from "@/lib/links/queries";
import { updateLinkInputSchema } from "@/lib/links/validation";
import { getLinksDb } from "@/lib/worker-env";

export const Route = createFileRoute("/api/links/$id")({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        if (!(await getOwnerSession(request))) {
          return jsonResponse({ error: "Unauthorized." }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          return jsonResponse(
            { error: "JSON body required." },
            { status: 415 },
          );
        }

        const parsed = updateLinkInputSchema.safeParse(await request.json());
        if (!parsed.success) {
          return jsonResponse(
            { error: "Invalid link payload.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const db = getRouteLinksDb(request);
        if (db instanceof Response) return db;

        const link = await updateLink(db, params.id, parsed.data);
        if (!link)
          return jsonResponse({ error: "Not found." }, { status: 404 });

        return jsonResponse({ link });
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

function getRouteLinksDb(request: Request) {
  return (
    getLinksDb(request) ??
    jsonResponse({ error: "LINKS_DB binding is unavailable." }, { status: 503 })
  );
}
