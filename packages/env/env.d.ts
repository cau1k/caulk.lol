// This file infers types for the cloudflare:workers environment from Alchemy resources.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

type Env = import("./src/types").CloudflareEnv;

declare namespace Cloudflare {
  type Env = import("./src/types").CloudflareEnv;
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
