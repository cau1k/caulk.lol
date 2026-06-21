import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { schema } from "@caulk.lol/db";

import { protectedProcedure, router } from "../index";
import type { Context } from "../context";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(48).default("caulk cli"),
});

const passkeyIdSchema = z.object({
  id: z.string().min(1),
});

const renamePasskeySchema = passkeyIdSchema.extend({
  name: z.string().trim().min(1).max(64),
});

const deviceCodeSchema = z.object({
  userCode: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.replace(/\s+/g, "").toUpperCase()),
});

const deviceStatusSchema = z.object({
  user_code: z.string(),
  status: z.enum(["pending", "approved", "denied"]),
});

export const securityRouter = router({
  apiKey: router({
    create: protectedProcedure.input(createApiKeySchema).mutation(async ({ ctx, input }) => {
      const key = await ctx.auth.api.createApiKey({
        body: {
          name: input.name,
          userId: ctx.session.user.id,
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
      return { apiKey: key.key };
    }),
  }),
  device: router({
    approve: protectedProcedure.input(deviceCodeSchema).mutation(async ({ ctx, input }) => {
      return await ctx.auth.api.deviceApprove({
        body: { userCode: input.userCode },
        headers: ctx.headers,
      });
    }),
    deny: protectedProcedure.input(deviceCodeSchema).mutation(async ({ ctx, input }) => {
      return await ctx.auth.api.deviceDeny({
        body: { userCode: input.userCode },
        headers: ctx.headers,
      });
    }),
    verify: protectedProcedure.input(deviceCodeSchema).query(async ({ ctx, input }) => {
      const result = await ctx.auth.api.deviceVerify({
        query: { user_code: input.userCode },
      });
      return deviceStatusSchema.parse(result);
    }),
  }),
  passkey: router({
    delete: protectedProcedure.input(passkeyIdSchema).mutation(async ({ ctx, input }) => {
      await ensureOwnedPasskey(ctx, input.id);
      await ctx.db
        .delete(schema.passkey)
        .where(
          and(eq(schema.passkey.id, input.id), eq(schema.passkey.userId, ctx.session.user.id)),
        );
      return { success: true };
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          aaguid: schema.passkey.aaguid,
          backedUp: schema.passkey.backedUp,
          createdAt: schema.passkey.createdAt,
          deviceType: schema.passkey.deviceType,
          id: schema.passkey.id,
          name: schema.passkey.name,
          transports: schema.passkey.transports,
        })
        .from(schema.passkey)
        .where(eq(schema.passkey.userId, ctx.session.user.id))
        .orderBy(desc(schema.passkey.createdAt));

      return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt?.toISOString() ?? null,
      }));
    }),
    rename: protectedProcedure.input(renamePasskeySchema).mutation(async ({ ctx, input }) => {
      await ensureOwnedPasskey(ctx, input.id);
      await ctx.db
        .update(schema.passkey)
        .set({ name: input.name })
        .where(
          and(eq(schema.passkey.id, input.id), eq(schema.passkey.userId, ctx.session.user.id)),
        );
      return { success: true };
    }),
  }),
});

type ProtectedContext = Context & { session: NonNullable<Context["session"]> };

async function ensureOwnedPasskey(ctx: ProtectedContext, id: string) {
  const [passkey] = await ctx.db
    .select({ id: schema.passkey.id })
    .from(schema.passkey)
    .where(and(eq(schema.passkey.id, id), eq(schema.passkey.userId, ctx.session.user.id)))
    .limit(1);

  if (!passkey) throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found" });
}
