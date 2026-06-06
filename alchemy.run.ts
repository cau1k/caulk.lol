import { existsSync } from "node:fs";
import path from "node:path";
import alchemy from "alchemy";
import {
  AnalyticsEngineDataset,
  KVNamespace,
  TanStackStart,
} from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";

const app = await alchemy("caulk-lol", {
  stage: process.env.STAGE ?? "prod",
  stateStore: process.env.CI
    ? (scope) => new CloudflareStateStore(scope, { forceUpdate: true })
    : undefined,
  adopt: true,
});

const hasBuildOutput = existsSync(
  path.resolve(process.cwd(), "dist/server/index.js"),
);

const tweetCache = await KVNamespace("tweet-cache", {
  title: `${app.name}-${app.stage}-tweet-cache`,
});

const analyticsDatasetName = "CAULK_SITE_METRICS";

const siteMetrics = AnalyticsEngineDataset("site-metrics", {
  dataset: analyticsDatasetName,
});

export const site = await TanStackStart("site", {
  name: `${app.name}-${app.stage}-site`,
  domains: ["caulk.lol"],
  // Disable the workers.dev URL to avoid leaking account subdomain in public URLs.
  url: false,
  assets: {
    run_worker_first: [
      "/*",
      "!/assets/*",
      "!/fonts/*",
      "!/media/*",
      "!/cdn-cgi/*",
    ],
  },
  build: {
    memoize:
      process.env.CI || !hasBuildOutput
        ? false
        : {
            patterns: [
              "./src/**",
              "./components/**",
              "./content/**",
              "./public/**",
              "./styles/**",
              "./source.config.ts",
              "./vite.config.ts",
              "./package.json",
              "./bun.lock",
              "./tsconfig.json",
              "./tsr.config.json",
            ],
          },
  },
  bindings: {
    TWEET_CACHE: tweetCache,
    SITE_METRICS: siteMetrics,
    ANALYTICS_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    ANALYTICS_API_TOKEN: alchemy.secret(
      process.env.CLOUDFLARE_API_TOKEN ?? "",
      "analytics-api-token",
    ),
    ANALYTICS_DATASET: analyticsDatasetName,
  },
  dev: { command: "vite dev --port 3000" },
});

console.log({ url: site.url });
await app.finalize();
