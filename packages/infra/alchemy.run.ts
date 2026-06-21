import { existsSync } from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import alchemy from "alchemy";
import {
  AnalyticsEngineDataset,
  D1Database,
  KVNamespace,
  TanStackStart,
  Worker,
} from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "../../.env" });
config({ path: "./.env" });
config({ path: "../../apps/blog/.env" });
config({ path: "../../apps/admin/.env" });
config({ path: "../../apps/server/.env" });

const stage = process.env.STAGE ?? "prod";
const blogCwd = fileURLToPath(new URL("../../apps/blog/", import.meta.url));
const hasBlogBuildOutput = existsSync(path.join(blogCwd, "dist/server/index.js"));

const app = await alchemy("caulk-lol", {
  stage,
  stateStore: process.env.CI
    ? (scope) => new CloudflareStateStore(scope, { forceUpdate: true })
    : undefined,
  adopt: true,
});

const tweetCache = await KVNamespace("tweet-cache", {
  title: `${app.name}-${app.stage}-tweet-cache`,
});

const analyticsDatasetName = "CAULK_SITE_METRICS";

const siteMetrics = AnalyticsEngineDataset("site-metrics", {
  dataset: analyticsDatasetName,
});

const linksDb = await D1Database("links-db", {
  name: `${app.name}-${app.stage}-links`,
  migrationsDir: "../../packages/db/src/migrations",
});

const authSecret = requiredSecret("BETTER_AUTH_SECRET", "better-auth-secret");
const adminBootstrapToken = requiredSecret(
  "ADMIN_BOOTSTRAP_TOKEN",
  "admin-bootstrap-token",
);
const betterAuthUrl = requiredEnv("BETTER_AUTH_URL");
const corsOrigin = requiredEnv("CORS_ORIGIN");
const ownerEmail = requiredEnv("OWNER_EMAIL");
const analyticsAccountId = readEnv("ANALYTICS_ACCOUNT_ID") ?? readEnv("CLOUDFLARE_ACCOUNT_ID");
const analyticsApiToken = readEnv("ANALYTICS_API_TOKEN") ?? readEnv("CLOUDFLARE_API_TOKEN");

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  url: true,
  bindings: {
    DB: linksDb,
    LINKS_DB: linksDb,
    CORS_ORIGIN: corsOrigin,
    BETTER_AUTH_SECRET: authSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    ADMIN_BOOTSTRAP_TOKEN: adminBootstrapToken,
    OWNER_EMAIL: ownerEmail,
  },
  dev: {
    port: 3001,
  },
});

const serverUrl = requireResourceUrl("server", server.url);

const sharedSiteBindings = {
  DB: linksDb,
  LINKS_DB: linksDb,
  TWEET_CACHE: tweetCache,
  SITE_METRICS: siteMetrics,
  CORS_ORIGIN: corsOrigin,
  BETTER_AUTH_SECRET: authSecret,
  BETTER_AUTH_URL: betterAuthUrl,
  ADMIN_BOOTSTRAP_TOKEN: adminBootstrapToken,
  OWNER_EMAIL: ownerEmail,
  ANALYTICS_DATASET: analyticsDatasetName,
  VITE_SERVER_URL: serverUrl,
  ...optionalPlainBinding("ANALYTICS_ACCOUNT_ID", analyticsAccountId),
  ...optionalSecretBinding("ANALYTICS_API_TOKEN", analyticsApiToken, "analytics-api-token"),
};

const blogPublicConfig =
  stage === "prod"
    ? {
        domains: ["caulk.lol"],
        url: false,
      }
    : {
        url: true,
      };

const adminPublicConfig =
  stage === "prod"
    ? {
        domains: ["admin.caulk.lol"],
        url: false,
      }
    : {
        url: true,
      };

export const blog = await TanStackStart("blog", {
  cwd: "../../apps/blog",
  name: `${app.name}-${app.stage}-blog`,
  ...blogPublicConfig,
  assets: {
    run_worker_first:
      stage === "prod"
        ? ["/*", "!/assets/*", "!/fonts/*", "!/media/*", "!/cdn-cgi/*"]
        : false,
  },
  build: {
    memoize:
      process.env.CI || !hasBlogBuildOutput
        ? false
        : {
            patterns: [
              "./src/**/*.{css,js,jsx,ts,tsx}",
              "./content/**/*.{json,md,mdx,ts,tsx}",
              "./public/**/*.*",
              "./source.config.ts",
              "./vite.config.ts",
              "./package.json",
              "../../pnpm-lock.yaml",
              "./tsconfig.json",
              "./tsr.config.json",
            ],
          },
  },
  bindings: sharedSiteBindings,
  dev: {
    command: "vite dev --host 127.0.0.1 --port 3000",
  },
});

export const admin = await TanStackStart("admin", {
  cwd: "../../apps/admin",
  name: `${app.name}-${app.stage}-admin`,
  ...adminPublicConfig,
  bindings: sharedSiteBindings,
  dev: {
    command: "vite dev --host 127.0.0.1 --port 3002",
  },
});

console.log(`Blog   -> ${blog.url}`);
console.log(`Admin  -> ${admin.url}`);
console.log(`Server -> ${serverUrl}`);

await app.finalize();

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function requiredEnv(name: string): string {
  const value = readEnv(name);
  if (!value) throw new Error(`${name} is required for infrastructure.`);
  return value;
}

function requiredSecret(envName: string, secretName: string) {
  return alchemy.secret(requiredEnv(envName), secretName);
}

function requireResourceUrl(name: string, url: string | undefined): string {
  if (!url) throw new Error(`${name} URL was not created.`);
  return url;
}

function optionalPlainBinding(name: string, value: string | undefined): Record<string, string> {
  return value ? { [name]: value } : {};
}

function optionalSecretBinding(name: string, value: string | undefined, secretName: string) {
  return value ? { [name]: alchemy.secret(value, secretName) } : {};
}
