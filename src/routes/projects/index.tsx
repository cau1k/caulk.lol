import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { baseOptions } from "@/lib/layout.shared";
import { projectRegistry } from "@/lib/projects";

export const Route = createFileRoute("/projects/")({
  loader: () => serverLoader(),
  component: ProjectsIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  return { projects: Object.values(projectRegistry) };
});

function ProjectsIndex() {
  const { projects } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-14">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        </header>

        {projects.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Project docs are on the way."
          />
        ) : (
          <div className="group/list">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$project"
                params={{ project: project.id }}
                className="group/item block -mx-3 rounded-lg px-3 py-4 transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:opacity-100!"
              >
                <article>
                  <h2 className="font-medium transition-colors group-hover/item:text-primary">
                    {project.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {project.host}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>
    </HomeLayout>
  );
}
