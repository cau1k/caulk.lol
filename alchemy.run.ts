import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";

const app = await alchemy("caulk-lol", {
  stage: process.env.STAGE ?? "prod",
  stateStore: process.env.CI
    ? (scope) => new CloudflareStateStore(scope, { forceUpdate: true })
    : undefined,
});

export const site = await TanStackStart("site", {
  name: `${app.name}-${app.stage}-site`,
  domains: ["caulk.lol"],
  dev: { command: "vite dev --port 3000" },
});

console.log({ url: site.url });
await app.finalize();
