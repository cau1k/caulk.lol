import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../../", import.meta.url));

/** Source inventory, independent of the prerender crawler (which can miss unlinked tags). */
export async function publicRoutes() {
  const files = await readdir(`${root}apps/blog/src/routes`, { recursive: true });
  const routes = [];
  for (const file of files.filter((file) => /\.tsx?$/.test(file))) {
    if (file === "__root.tsx" || /^(admin|api|og)\//.test(file)) continue;
    const source = await readFile(`${root}apps/blog/src/routes/${file}`, "utf8");
    const path = source.match(/createFileRoute\("([^"]+)"\)/)?.[1];
    if (!path) throw new Error(`Unclassified public route: ${file}`);
    if (["/llms-full.txt", "/llms.mdx/$"].includes(path)) continue;
    if (["/posts/$slug", "/posts/tags/$tag"].includes(path)) continue;
    if (path.includes("$")) throw new Error(`Add dynamic inventory for ${path}`);
    routes.push({ path: path.replace(/\/$/, "") || "/", kind: "page" });
  }
  const posts = await readdir(`${root}apps/blog/content/posts`);
  const tags = new Set();
  for (const file of posts.filter((file) => /\.mdx?$/.test(file))) {
    const source = await readFile(`${root}apps/blog/content/posts/${file}`, "utf8");
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) throw new Error(`Missing frontmatter: ${file}`);
    const metadata = parse(frontmatter[1]);
    if (metadata.draft) continue;
    routes.push({
      path: `/posts/${file.replace(/\.mdx?$/, "")}`,
      kind: "post",
      title: metadata.title,
    });
    for (const tag of metadata.tags ?? []) tags.add(tag.toLowerCase());
  }
  for (const tag of tags) {
    routes.push({ path: `/posts/tags/${encodeURIComponent(tag)}`, kind: "tag" });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

/** Non-HTML public resources are checked separately, never timed as HTML pages. */
export function publicResources(routes) {
  return [
    { path: "/llms-full.txt", type: "text/plain" },
    { path: "/api/search?query=typescript", type: "application/json" },
    { path: "/api/analytics", type: "application/json" },
    ...routes
      .filter((route) => route.kind === "post")
      .flatMap((route) => {
        const slug = route.path.split("/").at(-1);
        return [
          { path: `/posts/${slug}.mdx`, type: "text/markdown" },
          { path: `/llms.mdx/${slug}`, type: "text/markdown" },
          { path: `/og/posts/${slug}/image.webp`, type: "image/webp" },
        ];
      }),
  ];
}
