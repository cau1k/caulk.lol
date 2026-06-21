import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { rewritePath } from "fumadocs-core/negotiation";
import { recordSiteMetric } from "@/lib/analytics-engine";

const { rewrite: rewriteLLM } = rewritePath(
  "/posts{/*path}.mdx",
  "/llms.mdx{/*path}",
);

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);
  const path = rewriteLLM(url.pathname);

  if (path) {
    throw redirect({ href: path });
  }

  return next();
});

const siteMetricsMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const startedAt = performance.now();
    const result = await next();
    recordSiteMetric(request, result.response, performance.now() - startedAt);
    return result;
  },
);

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [llmMiddleware, siteMetricsMiddleware],
  };
});
