import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ProjectDocs, preloadProjectContent } from "@/components/project-docs";
import { getProjectDocsData } from "@/lib/project-docs";

type ProjectPathInput = {
  project: string;
  slugs: string[];
};

export const Route = createFileRoute("/projects/$project/$")({
  loader: async ({ params }) => {
    const data = await serverLoader({
      data: {
        project: params.project,
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
  component: ProjectSplatRoute,
});

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((input: ProjectPathInput) => input)
  .handler(async ({ data }) => getProjectDocsData(data.project, data.slugs));

function ProjectSplatRoute() {
  return <ProjectDocs data={Route.useLoaderData()} />;
}
