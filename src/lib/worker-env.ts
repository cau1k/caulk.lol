import { env as workerEnv } from "cloudflare:workers";
import type { D1Database } from "@cloudflare/workers-types";

export type AppEnv = {
  LINKS_DB?: D1Database;
  BETTER_AUTH_SECRET?: unknown;
  ADMIN_BOOTSTRAP_TOKEN?: unknown;
  OWNER_EMAIL?: unknown;
};

type CloudflareRuntime = {
  cloudflare?: {
    env?: AppEnv;
  };
};

type RuntimeRequest = Request & {
  runtime?: CloudflareRuntime;
};

export function getAppEnv(request?: Request): AppEnv {
  const runtimeEnv = request
    ? (request as RuntimeRequest).runtime?.cloudflare?.env
    : undefined;
  return {
    ...(workerEnv as AppEnv),
    ...runtimeEnv,
  };
}

export function readEnvString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getLinksDb(request?: Request): D1Database | undefined {
  return getAppEnv(request).LINKS_DB;
}
