import { createAuth } from "@caulk.lol/auth";
import { createDb } from "@caulk.lol/db";
import type { CloudflareEnv } from "@caulk.lol/env/bindings";
import type { Context as HonoContext } from "hono";

type HonoBindings = {
  Bindings: CloudflareEnv;
};

export type CreateContextOptions = {
  context: HonoContext<HonoBindings>;
};

export async function createContext({ context }: CreateContextOptions) {
  const auth = createAuth(context.env);
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  return {
    db: createDb(context.env),
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
