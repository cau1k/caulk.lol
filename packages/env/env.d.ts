// This file infers types for the cloudflare:workers environment from Alchemy resources.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

type Env = import("./src/types").CloudflareEnv;

type ImportMetaEnv = {
  readonly VITE_SERVER_URL?: string;
};

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace Cloudflare {
  type Env = import("./src/types").CloudflareEnv;
}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
