import type { D1Database } from "@cloudflare/workers-types";
import { getLinksDb } from "@/lib/worker-env";
import type {
  CreateLinkInput,
  LinkStatus,
  UpdateLinkInput,
} from "./validation";
import { normalizeUrl } from "./validation";

export type GoodLink = {
  id: string;
  url: string;
  canonicalUrl: string;
  title: string;
  description: string | null;
  reason: string;
  tags: string[];
  status: LinkStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
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
  source: string;
  created_at: string;
  updated_at: string;
};

export class LinksDbUnavailableError extends Error {
  constructor() {
    super("LINKS_DB binding is unavailable.");
  }
}

export class DuplicateLinkError extends Error {
  constructor(url: string) {
    super(`Link already exists: ${url}`);
  }
}

export function requireLinksDb(request?: Request): D1Database {
  const db = getLinksDb(request);
  if (!db) throw new LinksDbUnavailableError();
  return db;
}

export async function listLinks(
  db: D1Database,
  options: { includeArchived?: boolean } = {},
): Promise<GoodLink[]> {
  const query = options.includeArchived
    ? "select * from good_links order by created_at desc"
    : "select * from good_links where status = 'published' order by created_at desc";

  const result = await db.prepare(query).all<GoodLinkRow>();
  return (result.results ?? []).map(rowToGoodLink);
}

export async function findLinkById(
  db: D1Database,
  id: string,
): Promise<GoodLink | null> {
  const row = await db
    .prepare("select * from good_links where id = ?")
    .bind(id)
    .first<GoodLinkRow>();

  return row ? rowToGoodLink(row) : null;
}

export async function createLink(
  db: D1Database,
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
  db: D1Database,
  id: string,
  input: UpdateLinkInput,
): Promise<GoodLink | null> {
  const existing = await findLinkById(db, id);
  if (!existing) return null;

  const next = {
    title: input.title ?? existing.title,
    description:
      input.description === undefined
        ? existing.description
        : input.description,
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
    const tags = JSON.parse(value) as unknown;
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
