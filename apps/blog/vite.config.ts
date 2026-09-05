import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react-swc";
import alchemy from "alchemy/cloudflare/tanstack-start";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";
import { parse } from "yaml";
import { postAssetsPlugin } from "./plugins/posts";

// Seed every published post/tag explicitly. Link crawling alone can omit a
// valid route when a navigation component stops linking to it.
const contentDirectory = new URL("./content/posts/", import.meta.url);
const publishedPosts = readdirSync(contentDirectory)
  .filter((file) => file.endsWith(".mdx"))
  .flatMap((file) => {
    const source = readFileSync(new URL(file, contentDirectory), "utf8");
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) throw new Error(`Missing frontmatter: ${file}`);
    const data = parse(frontmatter[1]) as { draft: boolean; tags?: string[] };
    if (data.draft) return [];
    return [{ slug: file.slice(0, -4), tags: data.tags ?? [] }];
  });
const prerenderPaths = new Set([
  "/",
  "/about",
  "/analytics",
  "/posts",
  "/posts/tags",
  ...publishedPosts.flatMap((post) => [
    `/posts/${post.slug}`,
    ...post.tags.map((tag) => `/posts/tags/${encodeURIComponent(tag.toLowerCase())}`),
  ]),
]);

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
    tsconfigPaths: true,
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
      ignoreOutdatedRequests: true,
    },
  },
  plugins: [
    mdx(await import("./source.config")),
    postAssetsPlugin(),
    tailwindcss(),
    ...(shouldUseAlchemy ? [alchemy({ configPath: alchemyConfigPath })] : []),
    tanstackStart({
      pages: [...prerenderPaths].map((path) => ({ path })),
      prerender: {
        enabled: true,
        headers: { "x-caulk-prerender": "1" },
        crawlLinks: true,
        filter: (page) =>
          !page.path.startsWith("/admin/") &&
          !page.path.startsWith("/media/") &&
          page.path !== "/links",
      },
    }),
    react(),
  ],
});
