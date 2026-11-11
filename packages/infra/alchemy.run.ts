import { existsSync } from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import alchemy from "alchemy";
import {
  AnalyticsEngineDataset,
  D1Database,
  EmailSender,
  KVNamespace,
  TanStackStart,
  Worker,
} from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";
import { blogAssets } from "./assets.ts";

config({ path: "../../.env" });
config({ path: "./.env" });
config({ path: "../../apps/blog/.env" });
config({ path: "../../apps/admin/.env" });
config({ path: "../../apps/server/.env" });

// Leave stage selection to Alchemy so --stage takes precedence over .env.
// Passing an explicit stage option would override the CLI flag in Alchemy 0.94.
process.env.STAGE ??= "prod";
const serverCwd = fileURLToPath(new URL("../../apps/server/", import.meta.url));
const blogCwd = fileURLToPath(new URL("../../apps/blog/", import.meta.url));
const serverBetterAuthMinimalBarrel = path.join(
  fileURLToPath(new URL("../../packages/auth/src/", import.meta.url)),
  "better-auth-minimal-barrel.ts",
);
const hasBlogBuildOutput = existsSync(path.join(blogCwd, "dist/server/index.js"));

const app = await alchemy("caulk-lol", {
  stateStore: process.env.CI
    ? (scope) => new CloudflareStateStore(scope, { forceUpdate: true })
    : undefined,
  adopt: true,
});

const stage = app.stage;
const domains = app.local
  ? undefined
  : {
      prod: { blog: "caulk.lol", admin: "admin.caulk.lol", server: "api.caulk.lol" },
      dev: { blog: "dev.caulk.lol", admin: "dev-admin.caulk.lol", server: "dev-api.caulk.lol" },
    }[stage];

const tweetCache = await KVNamespace("tweet-cache", {
  title: `${app.name}-${app.stage}-tweet-cache`,
});

const linkPreviewCache = await KVNamespace("link-preview-cache", {
  title: `${app.name}-${app.stage}-link-preview-cache`,
});

const analyticsDatasetName =
  stage === "prod"
    ? "CAULK_SITE_METRICS"
    : `CAULK_SITE_METRICS_${stage.replace(/[^a-z0-9_]/gi, "_").toUpperCase()}`;

const siteMetrics = AnalyticsEngineDataset("site-metrics", {
  dataset: analyticsDatasetName,
});

const linksDb = await D1Database("links-db", {
  name: `${app.name}-${app.stage}-links`,
  migrationsDir: "../../packages/db/src/migrations",
});

const authSecret = requiredSecret("BETTER_AUTH_SECRET", "better-auth-secret");
const adminBootstrapToken = requiredSecret("ADMIN_BOOTSTRAP_TOKEN", "admin-bootstrap-token");
const betterAuthUrl = domains ? `https://${domains.server}` : requiredEnv("BETTER_AUTH_URL");
const corsOrigin = domains
  ? `https://${domains.blog},https://${domains.admin}`
  : resolveCorsOrigin(requiredEnv("CORS_ORIGIN"));
const ownerEmail = requiredEnv("OWNER_EMAIL");
const authEmailFrom = "noreply@caulk.lol";
const serverEmailSender = EmailSender({
  allowedDestinationAddresses: [ownerEmail],
  allowedSenderAddresses: [authEmailFrom],
});
const siteEmailSender = EmailSender({
  allowedDestinationAddresses: [ownerEmail],
  allowedSenderAddresses: [authEmailFrom],
});
const analyticsAccountId = readEnv("ANALYTICS_ACCOUNT_ID") ?? readEnv("CLOUDFLARE_ACCOUNT_ID");
const analyticsApiToken = readEnv("ANALYTICS_API_TOKEN") ?? readEnv("CLOUDFLARE_API_TOKEN");

export const server = await Worker("server", {
  cwd: serverCwd,
  entrypoint: "src/index.ts",
  compatibility: "node",
  bundle: {
    plugins: [
      {
        name: "better-auth-minimal-root-alias",
        setup(build) {
          build.onResolve({ filter: /^better-auth$/ }, () => ({
            path: serverBetterAuthMinimalBarrel,
          }));
        },
      },
    ],
  },
  ...publicConfig(domains?.server),
  url: true,
  bindings: {
    DB: linksDb,
    LINKS_DB: linksDb,
    LINK_PREVIEW_CACHE: linkPreviewCache,
    CORS_ORIGIN: corsOrigin,
    BETTER_AUTH_SECRET: authSecret,
    BETTER_AUTH_URL: betterAuthUrl,
    ADMIN_BOOTSTRAP_TOKEN: adminBootstrapToken,
    OWNER_EMAIL: ownerEmail,
    AUTH_EMAIL_FROM: authEmailFrom,
    EMAIL: serverEmailSender,
  },
  dev: {
    port: 3001,
  },
});

const serverUrl = domains ? `https://${domains.server}` : requireResourceUrl("server", server.url);

const sharedSiteBindings = {
  DB: linksDb,
  LINKS_DB: linksDb,
  LINK_PREVIEW_CACHE: linkPreviewCache,
  TWEET_CACHE: tweetCache,
  SITE_METRICS: siteMetrics,
  CORS_ORIGIN: corsOrigin,
  BETTER_AUTH_SECRET: authSecret,
  BETTER_AUTH_URL: betterAuthUrl,
  ADMIN_BOOTSTRAP_TOKEN: adminBootstrapToken,
  OWNER_EMAIL: ownerEmail,
  AUTH_EMAIL_FROM: authEmailFrom,
  ANALYTICS_DATASET: analyticsDatasetName,
  VITE_SERVER_URL: serverUrl,
  ...optionalPlainBinding("ANALYTICS_ACCOUNT_ID", analyticsAccountId),
  ...optionalSecretBinding("ANALYTICS_API_TOKEN", analyticsApiToken, "analytics-api-token"),
};

export const blog = await TanStackStart("blog", {
  cwd: "../../apps/blog",
  name: `${app.name}-${app.stage}-blog`,
  ...publicConfig(domains?.blog),
  assets: app.local ? { run_worker_first: false } : blogAssets,
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
  bindings: {
    ...sharedSiteBindings,
    EMAIL: siteEmailSender,
  },
  dev: {
    command: "vite dev --host 127.0.0.1 --port 3000",
  },
});

export const admin = await TanStackStart("admin", {
  cwd: "../../apps/admin",
  name: `${app.name}-${app.stage}-admin`,
  ...publicConfig(domains?.admin),
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

function resolveCorsOrigin(value: string): string {
  const origins = uniqueOrigins(parseOriginList(value));

  if (origins.length === 0) throw new Error("CORS_ORIGIN must include at least one origin.");
  return origins.join(",");
}

function publicConfig(domainName: string | undefined) {
  if (!domainName) return { url: true };

  return {
    domains: [
      {
        domainName,
        zoneId: requiredEnv("CLOUDFLARE_ZONE_ID"),
        adopt: true,
        overrideExistingOrigin: true,
      },
    ],
    url: false,
  };
}

function parseOriginList(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function uniqueOrigins(origins: string[]): string[] {
  return Array.from(new Set(origins));
}

function optionalPlainBinding(name: string, value: string | undefined): Record<string, string> {
  return value ? { [name]: value } : {};
}

function optionalSecretBinding(name: string, value: string | undefined, secretName: string) {
  return value ? { [name]: alchemy.secret(value, secretName) } : {};
}
