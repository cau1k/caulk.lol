import alchemy from "alchemy";
import { D1Database, TanStackStart, Worker } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "./api/.env" });

const app = await alchemy("caulk-lol", {
  stage: process.env.STAGE ?? "prod",
  stateStore: process.env.CI
    ? (scope) => new CloudflareStateStore(scope, { forceUpdate: true })
    : undefined,
  adopt: true,
});

const db = await D1Database("database", {
  migrationsDir: "api/migrations",
});

export const api = await Worker("api", {
  cwd: "api",
  entrypoint: "src/index.ts",
  compatibility: "node",
  domains: ["blog-api.caulk.lol"],
  bindings: {
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN,
    GITHUB_CLIENT_ID: alchemy.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: alchemy.secret.env.GITHUB_CLIENT_SECRET,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL,
  },
  dev: {
    port: 8787,
  },
});

export const site = await TanStackStart("site", {
  domains: ["caulk.lol"],
  bindings: {
    VITE_API_URL: alchemy.env.VITE_API_URL,
  },
});

console.log(`API  -> ${api.url}`);
console.log(`Site -> ${site.url}`);

await app.finalize();
