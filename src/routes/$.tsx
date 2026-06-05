import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ProjectDocs, preloadProjectContent } from "@/components/project-docs";
import { getProjectDocsData } from "@/lib/project-docs";
import { getProject, type Project } from "@/lib/projects";

type HostProjectPathInput = {
  slugs: string[];
};

export const Route = createFileRoute("/$")({
  loader: async ({ params }) => {
    const data = await serverLoader({
      data: {
        slugs: params._splat?.split("/").filter(Boolean) ?? [],
      },
    });
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

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((input: HostProjectPathInput) => input)
  .handler(async ({ context, data }) => {
    const project = getHostProject(context);
    if (!project) throw notFound();

    return getProjectDocsData(project.id, data.slugs, true);
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
  return undefined;
}

function HostProjectSplatRoute() {
  return <ProjectDocs data={Route.useLoaderData()} />;
}
