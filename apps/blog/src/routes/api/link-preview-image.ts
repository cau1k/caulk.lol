import {
  type LinkPreviewResponse,
  resolveLinkPreview,
} from "@caulk.lol/api/link-preview";
import { createFileRoute } from "@tanstack/react-router";
import { getLinkPreviewCache } from "@/lib/link-preview-cache";

export const Route = createFileRoute("/api/link-preview-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url");
        if (!url) {
          return jsonResponse(
            { error: "url query parameter required." },
            { status: 400 },
          );
        }

        try {
          const preview = await resolveLinkPreview(url, {
            cache: getLinkPreviewCache(request),
          });

          return jsonResponse(
            { imageUrl: previewImageUrl(preview) },
            { headers: { "Cache-Control": previewImageCacheControl(preview) } },
          );
        } catch (error) {
          return jsonResponse({ error: errorMessage(error) }, { status: 502 });
        }
      },
    },
  },
});

function previewImageUrl(preview: LinkPreviewResponse): string | null {
  if (preview.preview.kind === "generic" && preview.preview.imageUrl) {
    return preview.preview.imageUrl;
  }

  if (preview.preview.kind === "youtube" && preview.preview.thumbnailUrl) {
    return preview.preview.thumbnailUrl;
  }

  if (preview.preview.kind === "tweet") {
    return tweetPreviewImage(preview.preview.data) ?? null;
  }

  return null;
}

function tweetPreviewImage(data: Record<string, unknown>): string | undefined {
  const photos = arrayValue(data.photos);
  const photoUrl = firstImageUrl(photos, ["url", "media_url_https"]);
  if (photoUrl) return photoUrl;

  return firstImageUrl(arrayValue(data.mediaDetails), [
    "media_url_https",
    "url",
  ]);
}

function firstImageUrl(
  items: readonly unknown[],
  keys: readonly string[],
): string | undefined {
  for (const item of items) {
    const record = recordValue(item);
    if (!record) continue;

    for (const key of keys) {
      const value = stringValue(record[key]);
      if (value) return value;
    }
  }

  return undefined;
}

function previewImageCacheControl(preview: LinkPreviewResponse) {
  if (preview.preview.kind === "unavailable") {
    return "public, max-age=60, s-maxage=300";
  }

  if (preview.meta.cacheSource === "live") {
    return "public, max-age=300, s-maxage=300";
  }

  return "public, max-age=3600, s-maxage=86400";
}

function arrayValue(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

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
  return error instanceof Error ? error.message : "Request failed.";
}
