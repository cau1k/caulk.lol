import { z } from "zod";

export const linkStatusSchema = z.enum(["draft", "published", "archived"]);
export const linkSourceSchema = z.enum(["ios", "cli", "chrome", "admin", "manual"]);

const tagsSchema = z
  .array(z.string().trim().min(1).max(32))
  .max(12)
  .default([])
  .transform((tags) =>
    Array.from(new Set(tags.map((tag) => tag.toLowerCase().replace(/\s+/g, "-")))),
  );

export const createLinkInputSchema = z.object({
  url: z.string().trim().url(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(280).optional(),
  reason: z.string().trim().min(1).max(400),
  tags: tagsSchema,
  source: linkSourceSchema.default("manual"),
  status: linkStatusSchema.default("published"),
});

export const updateLinkInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(280).nullable().optional(),
    reason: z.string().trim().min(1).max(400).optional(),
    tags: tagsSchema.optional(),
    status: linkStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No link fields provided.",
  });

export const goodLinkSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  canonicalUrl: z.string().url(),
  title: z.string(),
  description: z.string().nullable(),
  reason: z.string(),
  tags: z.array(z.string()),
  status: linkStatusSchema,
  source: linkSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const linksResponseSchema = z.object({
  links: z.array(goodLinkSchema),
});

export const linkResponseSchema = z.object({
  link: goodLinkSchema,
});

export type CreateLinkInput = z.infer<typeof createLinkInputSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkInputSchema>;
export type GoodLink = z.infer<typeof goodLinkSchema>;
export type LinkStatus = z.infer<typeof linkStatusSchema>;
export type LinkSource = z.infer<typeof linkSourceSchema>;

export type LinksDatabase = {
  prepare(query: string): LinksPreparedStatement;
};

type LinksPreparedStatement = {
  bind(...values: LinkBindingValue[]): LinksPreparedStatement;
  all<Row>(): Promise<LinksRowsResult<Row>>;
  first<Row>(): Promise<Row | null>;
  run(): Promise<unknown>;
};

type LinkBindingValue = string | number | null;

type LinksRowsResult<Row> = {
  results?: Row[];
};

type GoodLinkRow = {
  id: string;
  url: string;
  canonical_url: string;
  title: string;
  description: string | null;
  reason: string;
  tags: string;
  status: LinkStatus;
  source: LinkSource;
  created_at: string;
  updated_at: string;
};

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

export class DuplicateLinkError extends Error {
  constructor(url: string) {
    super(`Link already exists: ${url}`);
    this.name = "DuplicateLinkError";
  }
}

export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname === "/" && !url.search) return url.origin;
  return url.toString();
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadataResult> {
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
      description: cleanText(DESCRIPTION_PATTERN.exec(html)?.groups?.description),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Metadata request failed.",
    };
  }
}

export async function listLinks(
  db: LinksDatabase,
  options: { includeArchived?: boolean } = {},
): Promise<GoodLink[]> {
  const query = options.includeArchived
    ? "select * from good_links order by created_at desc"
    : "select * from good_links where status = 'published' order by created_at desc";

  const result = await db.prepare(query).all<GoodLinkRow>();
  return (result.results ?? []).map(rowToGoodLink);
}

export async function findLinkById(db: LinksDatabase, id: string): Promise<GoodLink | null> {
  const row = await db
    .prepare("select * from good_links where id = ?")
    .bind(id)
    .first<GoodLinkRow>();

  return row ? rowToGoodLink(row) : null;
}

export async function createLink(
  db: LinksDatabase,
  input: CreateLinkInput & { title: string },
): Promise<GoodLink> {
  const canonicalUrl = normalizeUrl(input.url);
  const existing = await db
    .prepare("select id from good_links where canonical_url = ? or url = ?")
    .bind(canonicalUrl, input.url)
    .first<{ id: string }>();

  if (existing) throw new DuplicateLinkError(canonicalUrl);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `insert into good_links (
        id, url, canonical_url, title, description, reason, tags, status, source, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.url,
      canonicalUrl,
      input.title,
      input.description ?? null,
      input.reason,
      JSON.stringify(input.tags),
      input.status,
      input.source,
      now,
      now,
    )
    .run();

  const created = await findLinkById(db, id);
  if (!created) throw new Error("Created link could not be read.");
  return created;
}

export async function updateLink(
  db: LinksDatabase,
  id: string,
  input: UpdateLinkInput,
): Promise<GoodLink | null> {
  const existing = await findLinkById(db, id);
  if (!existing) return null;

  const next = {
    title: input.title ?? existing.title,
    description: input.description === undefined ? existing.description : input.description,
    reason: input.reason ?? existing.reason,
    tags: input.tags ?? existing.tags,
    status: input.status ?? existing.status,
    updatedAt: new Date().toISOString(),
  };

  await db
    .prepare(
      `update good_links
       set title = ?, description = ?, reason = ?, tags = ?, status = ?, updated_at = ?
       where id = ?`,
    )
    .bind(
      next.title,
      next.description,
      next.reason,
      JSON.stringify(next.tags),
      next.status,
      next.updatedAt,
      id,
    )
    .run();

  return findLinkById(db, id);
}

function rowToGoodLink(row: GoodLinkRow): GoodLink {
  return {
    id: row.id,
    url: row.url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    description: row.description,
    reason: row.reason,
    tags: parseTags(row.tags),
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTags(value: string): string[] {
  try {
    const tags: unknown = JSON.parse(value);
    if (!Array.isArray(tags)) return [];
    return tags.filter((tag): tag is string => typeof tag === "string");
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Invalid link tags JSON: ${error.message}`
        : "Invalid link tags JSON.",
    );
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
