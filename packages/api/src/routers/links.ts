import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireBinding, type CloudflareEnv } from "@caulk.lol/env/bindings";

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
} from "../links";
import {
  type LinkPreviewCacheStore,
  type LinkPreviewResponse,
  resolveLinkPreview,
} from "../link-preview";
import { protectedProcedure, publicProcedure, router } from "../index";

const listInputSchema = z.object({
  includeArchived: z.boolean().default(false),
});

const updateInputSchema = z.object({
  id: z.string().min(1),
  input: updateLinkInputSchema,
});

const previewRefreshInputSchema = z.object({
  url: z.string().trim().url(),
});

const previewRefreshAllInputSchema = z.object({
  includeArchived: z.boolean().default(true),
});

type PreviewRefreshAllResult = {
  id: string;
  url: string;
  kind: LinkPreviewResponse["preview"]["kind"];
  ok: boolean;
  preview: LinkPreviewResponse;
};

export const linksRouter = router({
  list: publicProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const includeArchived = Boolean(input.includeArchived && ctx.session);
    return await listLinks(getLinksDb(ctx.env), { includeArchived });
  }),
  adminList: protectedProcedure.query(async ({ ctx }) => {
    return await listLinks(getLinksDb(ctx.env), { includeArchived: true });
  }),
  create: protectedProcedure.input(createLinkInputSchema).mutation(async ({ ctx, input }) => {
    const canonicalUrl = normalizeUrl(input.url);
    const metadata: LinkMetadataResult =
      input.title && input.description ? { ok: true } : await fetchLinkMetadata(canonicalUrl);
    const title = input.title ?? (metadata.ok ? metadata.title : undefined);

    if (!title) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: metadata.ok ? "title required" : metadata.error,
      });
    }

    try {
      return await createLink(getLinksDb(ctx.env), {
        ...input,
        description: input.description ?? (metadata.ok ? metadata.description : undefined),
        title,
        url: canonicalUrl,
      });
    } catch (error) {
      if (error instanceof DuplicateLinkError) {
        throw new TRPCError({ code: "CONFLICT", message: error.message });
      }
      throw error;
    }
  }),
  update: protectedProcedure.input(updateInputSchema).mutation(async ({ ctx, input }) => {
    const link = await updateLink(getLinksDb(ctx.env), input.id, input.input);
    if (!link) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
    }
    return link;
  }),
  preview: router({
    refresh: protectedProcedure
      .input(previewRefreshInputSchema)
      .mutation(async ({ ctx, input }) => {
        return await resolveLinkPreview(input.url, {
          cache: getLinkPreviewCache(ctx.env),
          forceRefresh: true,
        });
      }),
    refreshAll: protectedProcedure
      .input(previewRefreshAllInputSchema)
      .mutation(async ({ ctx, input }) => {
        const links = await listLinks(getLinksDb(ctx.env), {
          includeArchived: input.includeArchived,
        });
        const cache = getLinkPreviewCache(ctx.env);
        const results: PreviewRefreshAllResult[] = [];

        for (const link of links) {
          const preview = await resolveLinkPreview(link.url, {
            cache,
            forceRefresh: true,
          });

          results.push({
            id: link.id,
            url: link.url,
            kind: preview.preview.kind,
            ok: preview.preview.kind !== "unavailable",
            preview,
          });
        }

        return {
          count: results.length,
          refreshed: results.filter((result) => result.ok).length,
          results,
        };
      }),
  }),
});

function getLinksDb(env: CloudflareEnv) {
  return requireBinding(env.LINKS_DB, "LINKS_DB");
}

function getLinkPreviewCache(env: CloudflareEnv): LinkPreviewCacheStore | null {
  return env.LINK_PREVIEW_CACHE ?? env.TWEET_CACHE ?? null;
}
