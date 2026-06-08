import { createFileRoute } from "@tanstack/react-router";
import { canWriteLinks, getOwnerSession } from "@/lib/auth-guards";
import { fetchLinkMetadata } from "@/lib/links/metadata";
import { createLink, DuplicateLinkError, listLinks } from "@/lib/links/queries";
import { createLinkInputSchema, normalizeUrl } from "@/lib/links/validation";
import { getLinksDb } from "@/lib/worker-env";

export const Route = createFileRoute("/api/links")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = getRouteLinksDb(request);
        if (db instanceof Response) return db;

        const url = new URL(request.url);
        const includeArchived =
          url.searchParams.get("include") === "archived" &&
          Boolean(await getOwnerSession(request));

        return jsonResponse({
          links: await listLinks(db, { includeArchived }),
        });
      },
      POST: async ({ request }) => {
        if (!(await canWriteLinks(request))) {
          return jsonResponse({ error: "Unauthorized." }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          return jsonResponse(
            { error: "JSON body required." },
            { status: 415 },
          );
        }

        const parsed = createLinkInputSchema.safeParse(await request.json());
        if (!parsed.success) {
          return jsonResponse(
            { error: "Invalid link payload.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const canonicalUrl = normalizeUrl(parsed.data.url);
        const metadata =
          parsed.data.title && parsed.data.description
            ? { ok: true as const }
            : await fetchLinkMetadata(canonicalUrl);

        const title =
          parsed.data.title ?? (metadata.ok ? metadata.title : undefined);

        if (!title) {
          return jsonResponse(
            {
              error: "title required",
              metadataError: metadata.ok ? undefined : metadata.error,
            },
            { status: 400 },
          );
        }

        try {
          const db = getRouteLinksDb(request);
          if (db instanceof Response) return db;

          const link = await createLink(db, {
            ...parsed.data,
            url: canonicalUrl,
            title,
            description:
              parsed.data.description ??
              (metadata.ok ? metadata.description : undefined),
          });

          return jsonResponse({ link }, { status: 201 });
        } catch (error) {
          if (error instanceof DuplicateLinkError) {
            return jsonResponse({ error: error.message }, { status: 409 });
          }
          throw error;
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

function getRouteLinksDb(request: Request) {
  return (
    getLinksDb(request) ??
    jsonResponse({ error: "LINKS_DB binding is unavailable." }, { status: 503 })
  );
}
