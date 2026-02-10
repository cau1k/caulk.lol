import { existsSync } from "node:fs";
import path from "node:path";
import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
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

export const site = await TanStackStart("site", {
  name: `${app.name}-${app.stage}-site`,
  domains: ["caulk.lol"],
  // Disable the workers.dev URL to avoid leaking account subdomain in public URLs.
  url: false,
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
  dev: { command: "vite dev --port 3000" },
});

console.log({ url: site.url });
await app.finalize();
