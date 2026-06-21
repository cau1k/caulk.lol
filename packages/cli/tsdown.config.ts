import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@caulk\.lol\/.*/],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  platform: "node",
});
