import alchemy from "alchemy";
import { TanStackStart } from "alchemy/cloudflare";

const app = await alchemy("caulk-lol", {
  stage: process.env.STAGE ?? "prod",
});

export const site = await TanStackStart("site", {
  name: `${app.name}-${app.stage}-site`,
  dev: { command: "vite dev --port 3000" },
});

console.log({ url: site.url });
await app.finalize();
