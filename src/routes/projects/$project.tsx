import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ProjectDocs, preloadProjectContent } from "@/components/project-docs";
import { getProjectDocsData } from "@/lib/project-docs";

export const Route = createFileRoute("/projects/$project")({
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.project });
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
  component: ProjectRoute,
});

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((project: string) => project)
  .handler(async ({ data: project }) => getProjectDocsData(project, []));

function ProjectRoute() {
  const data = Route.useLoaderData();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  if (pathname !== `/projects/${data.project.id}`) return <Outlet />;

  return <ProjectDocs data={data} />;
}
