import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react-swc";
import alchemy from "alchemy/cloudflare/tanstack-start";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const betterAuthMinimalBarrel = fileURLToPath(
  new URL("./src/lib/better-auth-minimal-barrel.ts", import.meta.url),
);

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
    ],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    exclude: ["web-haptics"],
  },
  ssr: {
    external: [],
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
    alchemy(),
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
