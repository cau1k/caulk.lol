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
import { protectedProcedure, publicProcedure, router } from "../index";

const listInputSchema = z.object({
  includeArchived: z.boolean().default(false),
});

const updateInputSchema = z.object({
  id: z.string().min(1),
  input: updateLinkInputSchema,
});

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
});

function getLinksDb(env: CloudflareEnv) {
  return requireBinding(env.LINKS_DB, "LINKS_DB");
}
