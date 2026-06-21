import type { CloudflareEnv } from "@caulk.lol/env/bindings";

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}
