import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!isAdminSession(ctx.session)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No admin session",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

function isAdminSession(session: Context["session"]): session is NonNullable<Context["session"]> {
  if (!session) return false;
  return hasAdminRole(session.user);
}

function hasAdminRole(user: unknown) {
  if (typeof user !== "object" || user === null) return false;
  if (!("role" in user) || typeof user.role !== "string") return false;
  return user.role.split(",").includes("admin");
}
