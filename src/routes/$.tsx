import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProjectDocs, preloadProjectContent } from "@/components/project-docs";
import { getProjectDocsData } from "@/lib/project-docs";
import { getProject, getProjectByHost, type Project } from "@/lib/projects";

type LoaderContextWithServer = {
  serverContext?: unknown;
};

export const Route = createFileRoute("/$")({
  loader: async ({ context, params }) => {
    const project = getHostProject(
      (context as LoaderContextWithServer).serverContext,
    );
    if (!project) throw notFound();

    const data = getProjectDocsData(
      project.id,
      params._splat?.split("/").filter(Boolean) ?? [],
      true,
    );
    await preloadProjectContent(data.path);
    return data;
  },
  staleTime: Infinity,
  gcTime: 30 * 60_000,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
  }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} - ${loaderData.project.title}` },
          { name: "description", content: loaderData.description ?? "" },
        ]
      : [],
  }),
  component: HostProjectSplatRoute,
});

function getHostProject(serverContext: unknown): Project | undefined {
  if (
    serverContext &&
    typeof serverContext === "object" &&
    "projectHostId" in serverContext &&
    typeof serverContext.projectHostId === "string"
  ) {
    return getProject(serverContext.projectHostId) ?? undefined;
  }

  if (typeof window === "undefined") return undefined;
  return getProjectByHost(window.location.host) ?? undefined;
}

function HostProjectSplatRoute() {
  return <ProjectDocs data={Route.useLoaderData()} />;
}
