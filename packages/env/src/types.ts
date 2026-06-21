import type { admin, blog, server } from "@caulk.lol/infra/alchemy.run";

export type CloudflareEnv = typeof server.Env & typeof blog.Env & typeof admin.Env;
export type RuntimeEnv = Partial<CloudflareEnv>;
