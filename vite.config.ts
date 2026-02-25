import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react-swc";
import alchemy from "alchemy/cloudflare/tanstack-start";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: ["arch.catla-justice.ts.net"],
  },
  ssr: {
    external: [],
    optimizeDeps: {
      noDiscovery: true,
      include: [],
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
        filter: (page) => !page.path.startsWith("/media/"),
      },
    }),
    react(),
  ],
});
