import { protectedProcedure, publicProcedure, router } from "../index";
import { linksRouter } from "./links";
import { securityRouter } from "./security";
import { todoRouter } from "./todo";

export const appRouter = router({
  auth: router({
    me: protectedProcedure.query(({ ctx }) => ({
      user: ctx.session.user,
    })),
  }),
  healthCheck: publicProcedure.query(() => "OK"),
  links: linksRouter,
  privateData: protectedProcedure.query(({ ctx }) => ({
    message: "This is private",
    user: ctx.session.user,
  })),
  security: securityRouter,
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
