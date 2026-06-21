import type { CloudflareEnv } from "@caulk.lol/env/bindings";
import { getRuntimeEnv, readEnvString } from "@caulk.lol/env/runtime";

export type LinksDatabase = CloudflareEnv["LINKS_DB"];

export type AppEnv = Partial<
  Pick<
    CloudflareEnv,
    "LINKS_DB" | "BETTER_AUTH_SECRET" | "ADMIN_BOOTSTRAP_TOKEN" | "OWNER_EMAIL"
  >
>;

export function getAppEnv(request?: Request): AppEnv {
  return getRuntimeEnv(request);
}

export { readEnvString };

export function getLinksDb(request?: Request): LinksDatabase | undefined {
  return getAppEnv(request).LINKS_DB;
}
