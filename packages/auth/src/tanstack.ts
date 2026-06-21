import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { RuntimeEnv } from "@caulk.lol/env/bindings";

import { createApiKeyPlugin, createAuthConfig } from "./index";

export function createTanstackAuth(runtimeEnv: RuntimeEnv) {
  return betterAuth({
    ...createAuthConfig(runtimeEnv),
    plugins: [createApiKeyPlugin(), tanstackStartCookies()],
  });
}

export type TanstackAuth = ReturnType<typeof createTanstackAuth>;
