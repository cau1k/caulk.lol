import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import alchemy from "alchemy/cloudflare/tanstack-start";
import mdx from "fumadocs-mdx/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Load env vars into process.env for server-side code
const env = loadEnv("development", process.cwd(), "");
Object.assign(process.env, env);

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: ["arch.catla-justice.ts.net"],
  },
  define: {
    "process.env.GITHUB_CLIENT_ID": JSON.stringify(env.GITHUB_CLIENT_ID),
    "process.env.GITHUB_CLIENT_SECRET": JSON.stringify(env.GITHUB_CLIENT_SECRET),
    "process.env.BETTER_AUTH_SECRET": JSON.stringify(env.BETTER_AUTH_SECRET),
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
        enabled: false,
      },
    }),
    react(),
  ],
});
