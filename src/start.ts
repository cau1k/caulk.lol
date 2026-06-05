import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { rewritePath } from "fumadocs-core/negotiation";
import { getProjectByHost } from "@/lib/projects";

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

const projectHostMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);
  const project = getProjectByHost(url.host);
  if (!project) return next();

  const basePath = `/projects/${project.id}`;
  const targetUrl = new URL(request.url);
  targetUrl.host = "caulk.lol";
  targetUrl.pathname =
    url.pathname === basePath || url.pathname.startsWith(`${basePath}/`)
      ? url.pathname
      : `${basePath}${url.pathname === "/" ? "" : url.pathname}`;

  throw redirect({ href: targetUrl.toString() });
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [projectHostMiddleware, llmMiddleware],
  };
});
