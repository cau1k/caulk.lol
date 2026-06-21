export type LinkMetadataResult =
  | {
      ok: true;
      title?: string;
      description?: string;
    }
  | {
      ok: false;
      error: string;
    };

const TITLE_PATTERN = /<title[^>]*>(?<title>[\s\S]*?)<\/title>/i;
const DESCRIPTION_PATTERN =
  /<meta\s+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["'](?<description>[^"']*)["'][^>]*>/i;

export async function fetchLinkMetadata(
  url: string,
): Promise<LinkMetadataResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "caulk.lol link metadata fetcher",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Metadata request returned ${response.status}.`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { ok: false, error: "Metadata target is not HTML." };
    }

    const html = await response.text();
    return {
      ok: true,
      title: cleanText(TITLE_PATTERN.exec(html)?.groups?.title),
      description: cleanText(
        DESCRIPTION_PATTERN.exec(html)?.groups?.description,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Metadata request failed.",
    };
  }
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0 ? text : undefined;
}
