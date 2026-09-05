import { redirect } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { rewritePath } from "fumadocs-core/negotiation";
import { recordSiteMetric } from "@/lib/analytics-engine";
import { readPrerenderedPage } from "@/lib/prerender";
import { posts } from "@/lib/source";

const staticPages = new Set([
  "/",
  "/about",
  "/analytics",
  "/posts",
  "/posts/tags",
  ...posts
    .getPages()
    .flatMap((page) => [
      page.url,
      ...(page.data.tags ?? []).map(
        (tag) => `/posts/tags/${encodeURIComponent(tag.toLowerCase())}`,
      ),
    ]),
]);

const prerenderMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);
  // The build runs in a separate workerd isolate, so Node's prerender env flag
  // does not reach it. The local crawler marks its requests explicitly.
  if (
    import.meta.env.DEV ||
    (["localhost", "127.0.0.1"].includes(url.hostname) &&
      request.headers.get("x-caulk-prerender") === "1") ||
    !["GET", "HEAD"].includes(request.method)
  )
    return next();
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  // Tags are case-insensitive in the route loader. Share their canonical asset.
  const normalized = pathname.startsWith("/posts/tags/") ? pathname.toLowerCase() : pathname;
  if (!staticPages.has(normalized)) return next();
  url.pathname = normalized;
  return readPrerenderedPage(new Request(url, request), (asset) => env.ASSETS.fetch(asset));
});

const { rewrite: rewriteLLM } = rewritePath("/posts{/*path}.mdx", "/llms.mdx{/*path}");

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);
  const path = rewriteLLM(url.pathname);

  if (path) {
    throw redirect({ href: path });
  }

  return next();
});

const siteMetricsMiddleware = createMiddleware().server(async ({ next, request }) => {
  const startedAt = performance.now();
  const result = await next();
  recordSiteMetric(request, result.response, performance.now() - startedAt);
  return result;
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware, siteMetricsMiddleware, prerenderMiddleware],
  };
});
