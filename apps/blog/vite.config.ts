import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react-swc";
import alchemy from "alchemy/cloudflare/tanstack-start";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const alchemyConfigPath = fileURLToPath(
  new URL("./.alchemy/local/wrangler.jsonc", import.meta.url),
);
const shouldUseAlchemy = existsSync(alchemyConfigPath);
const cloudflareWorkersShimPath = fileURLToPath(
  new URL("../../packages/env/src/cloudflare-local.ts", import.meta.url),
);
const betterAuthMinimalBarrel = fileURLToPath(
  new URL("../../packages/auth/src/better-auth-minimal-barrel.ts", import.meta.url),
);
const cloudflareWorkersAlias = shouldUseAlchemy
  ? []
  : [
      {
        find: "cloudflare:workers",
        replacement: cloudflareWorkersShimPath,
      },
    ];

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: ["arch.catla-justice.ts.net"],
  },
  resolve: {
    alias: [
      {
        find: /^better-auth$/,
        replacement: betterAuthMinimalBarrel,
      },
      ...cloudflareWorkersAlias,
    ],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["web-haptics"],
  },
  ssr: {
    external: [],
    noExternal: ["react-tweet", /^@radix-ui\//],
    optimizeDeps: {
      noDiscovery: true,
      include: ["@excalidraw/excalidraw"],
      ignoreOutdatedRequests: true,
    },
  },
  plugins: [
    mdx(await import("./source.config")),
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    ...(shouldUseAlchemy ? [alchemy({ configPath: alchemyConfigPath })] : []),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        filter: (page) =>
          !page.path.startsWith("/admin/") &&
          !page.path.startsWith("/media/") &&
          page.path !== "/analytics" &&
          page.path !== "/links",
      },
    }),
    react(),
  ],
});
