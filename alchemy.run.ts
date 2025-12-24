import alchemy from "alchemy";
import { TanStackStart, Worker } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });

const app = await alchemy("caulk-lol", {
  stage: process.env.STAGE ?? "prod",
  stateStore: process.env.CI
    ? (scope) => new CloudflareStateStore(scope, { forceUpdate: true })
    : undefined,
  adopt: true,
});

export const api = await Worker("api", {
  name: `${app.name}-${app.stage}-api`,
  entrypoint: "./api/src/index.ts",
  domains: ["blog-api.caulk.lol"],
  bindings: {
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN,
    GITHUB_CLIENT_ID: alchemy.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: alchemy.secret.env.GITHUB_CLIENT_SECRET,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL,
  },
});

export const site = await TanStackStart("site", {
  name: `${app.name}-${app.stage}-site`,
  domains: ["caulk.lol"],
  dev: { command: "vite dev --port 3000" },
});

console.log({ api: api.url, site: site.url });
await app.finalize();
