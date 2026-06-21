import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const betterAuthMinimalBarrel = fileURLToPath(
  new URL("../../packages/auth/src/better-auth-minimal-barrel.ts", import.meta.url),
);

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  alias: {
    "better-auth": betterAuthMinimalBarrel,
  },
  deps: {
    alwaysBundle: [/@caulk\.lol\/.*/, /^better-auth$/],
    onlyBundle: false,
  },
});
