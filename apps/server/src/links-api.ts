import type { AuthSession } from "@caulk.lol/auth";
import { createAuth } from "@caulk.lol/auth";
import {
  createLink,
  createLinkInputSchema,
  DuplicateLinkError,
  fetchLinkMetadata,
  type LinkMetadataResult,
  listLinks,
  normalizeUrl,
  updateLink,
  updateLinkInputSchema,
} from "@caulk.lol/api/links";
import { requireBinding, type CloudflareEnv } from "@caulk.lol/env/bindings";
import type { EvlogVariables } from "evlog/hono";
import { Hono, type Context } from "hono";
import { z } from "zod";

type LinksApiEnv = EvlogVariables & {
  Bindings: CloudflareEnv;
};

type LinksApiContext = Context<LinksApiEnv>;
type AdminSession = Exclude<AuthSession, null>;

type JsonBodyResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      response: Response;
    };

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(48).default("good links client"),
});

export const linksApi = new Hono<LinksApiEnv>();

linksApi.get("/links", async (c) => {
  const includeArchived =
    c.req.query("include") === "archived" && Boolean(await getAdminSession(c));

  return c.json({
    links: await listLinks(getLinksDb(c), { includeArchived }),
  });
});

linksApi.post("/links", async (c) => {
  if (!(await getAdminSession(c))) {
    return c.json({ error: "Unauthorized." }, 401);
  }

  const body = await readJsonBody(c);
  if (!body.ok) return body.response;

  const parsed = createLinkInputSchema.safeParse(body.value);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid link payload.", issues: parsed.error.issues },
      400,
    );
  }

  const canonicalUrl = normalizeUrl(parsed.data.url);
  const metadata: LinkMetadataResult =
    parsed.data.title && parsed.data.description
      ? { ok: true }
      : await fetchLinkMetadata(canonicalUrl);
  const title = parsed.data.title ?? (metadata.ok ? metadata.title : undefined);

  if (!title) {
    return c.json(
      {
        error: "title required",
        metadataError: metadata.ok ? undefined : metadata.error,
      },
      400,
    );
  }

  try {
    const link = await createLink(getLinksDb(c), {
      ...parsed.data,
      url: canonicalUrl,
      title,
      description: parsed.data.description ?? (metadata.ok ? metadata.description : undefined),
    });

    return c.json({ link }, 201);
  } catch (error) {
    if (error instanceof DuplicateLinkError) {
      return c.json({ error: error.message }, 409);
    }
    throw error;
  }
});

linksApi.patch("/links/:id", async (c) => {
  if (!(await getAdminSession(c))) {
    return c.json({ error: "Unauthorized." }, 401);
  }

  const body = await readJsonBody(c);
  if (!body.ok) return body.response;

  const parsed = updateLinkInputSchema.safeParse(body.value);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid link payload.", issues: parsed.error.issues },
      400,
    );
  }

  const link = await updateLink(getLinksDb(c), c.req.param("id"), parsed.data);
  if (!link) return c.json({ error: "Not found." }, 404);

  return c.json({ link });
});

linksApi.get("/admin/me", async (c) => {
  const session = await getAdminSession(c);
  if (!session) return c.json({ error: "Unauthorized." }, 401);

  return c.json({ user: session.user });
});

linksApi.post("/admin/api-key", async (c) => {
  const session = await getAdminSession(c);
  if (!session) return c.json({ error: "Unauthorized." }, 401);

  const body = await readJsonBody(c);
  if (!body.ok) return body.response;

  const parsed = createApiKeySchema.safeParse(body.value);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid API key payload.", issues: parsed.error.issues },
      400,
    );
  }

  const key = await createAuth(c.env).api.createApiKey({
    body: {
      name: parsed.data.name,
      userId: session.user.id,
      prefix: "caulk_",
      permissions: {
        links: ["write"],
      },
      metadata: {
        purpose: "good-links",
      },
    },
  });

  if (!key.key) throw new Error("Created API key is missing its secret value.");

  return c.json({ apiKey: key.key }, 201);
});

async function readJsonBody(c: LinksApiContext): Promise<JsonBodyResult> {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: c.json({ error: "JSON body required." }, 415),
    };
  }

  try {
    return { ok: true, value: await c.req.json() };
  } catch {
    return {
      ok: false,
      response: c.json({ error: "Invalid JSON body." }, 400),
    };
  }
}

async function getAdminSession(c: LinksApiContext): Promise<AdminSession | null> {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session || !hasAdminRole(session.user)) return null;
  return session;
}

function hasAdminRole(user: unknown) {
  if (typeof user !== "object" || user === null) return false;
  if (!("role" in user) || typeof user.role !== "string") return false;
  return user.role.split(",").includes("admin");
}

function getLinksDb(c: LinksApiContext) {
  return requireBinding(c.env.LINKS_DB, "LINKS_DB");
}
