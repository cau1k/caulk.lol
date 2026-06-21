import type { D1Database } from "@cloudflare/workers-types";
import { getRuntimeEnv, readEnvString } from "@caulk.lol/env/runtime";

export type AppEnv = {
  LINKS_DB?: D1Database;
  BETTER_AUTH_SECRET?: unknown;
  ADMIN_BOOTSTRAP_TOKEN?: unknown;
  OWNER_EMAIL?: unknown;
};

export function getAppEnv(request?: Request): AppEnv {
  return getRuntimeEnv(request);
}

export { readEnvString };

export function getLinksDb(request?: Request): D1Database | undefined {
  return getAppEnv(request).LINKS_DB;
}
