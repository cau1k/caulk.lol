import { env as importedEnv } from "cloudflare:workers";

import type { RuntimeEnv } from "./bindings";

export {
  MissingRuntimeBindingError,
  readEnvString,
  requireBinding,
  requireEnvString,
  type CloudflareEnv,
  type RuntimeEnv,
} from "./bindings";

type CloudflareRuntime = {
  cloudflare?: {
    env?: RuntimeEnv;
  };
};

export function getRuntimeEnv(request?: Request): RuntimeEnv {
  return {
    ...importedEnv,
    ...getRequestRuntimeEnv(request),
  };
}

function getRequestRuntimeEnv(request?: Request): RuntimeEnv | undefined {
  if (!request || !("runtime" in request)) return undefined;
  const runtime = request.runtime;
  if (!isCloudflareRuntime(runtime)) return undefined;
  return runtime.cloudflare?.env;
}

function isCloudflareRuntime(value: unknown): value is CloudflareRuntime {
  if (!isRecord(value)) return false;
  const cloudflare = value.cloudflare;
  if (cloudflare === undefined) return true;
  if (!isRecord(cloudflare)) return false;
  const env = cloudflare.env;
  return env === undefined || isRecord(env);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
