import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { baseOptions } from "@/lib/layout.shared";
import { type Project, projectRegistry } from "@/lib/projects";

type ProjectListItem = Project & {
  href: string;
};

export const Route = createFileRoute("/projects/")({
  loader: () => serverLoader(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  }),
  component: ProjectsIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const projects = Object.values(projectRegistry)
    .filter((project) => project.status === "active")
    .map((project) => ({
      ...project,
      href: `/projects/${project.id}`,
    }));

  return { projects };
});

function ProjectsIndex() {
  const { projects } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-4 text-muted-foreground">
            Project docs, integration notes, and implementation overviews.
          </p>
        </header>

        <ProjectsIndexContent projects={projects} />
      </main>
    </HomeLayout>
  );
}

function ProjectsIndexContent({ projects }: { projects: ProjectListItem[] }) {
  return (
    <>
      {projects.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Project docs are on the way."
        />
      ) : (
        <div className="group/list">
          {projects.map((project) => (
            <ProjectListLink key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  );
}

function ProjectListLink({ project }: { project: ProjectListItem }) {
  const className =
    "group/item block -mx-3 rounded-lg px-4 py-4 transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:opacity-100!";
  const content = (
    <article className="flex flex-col gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="font-medium font-sans transition-colors group-hover/item:text-primary">
          {project.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{project.author}</span>
          <span className="text-muted-foreground/40" aria-hidden>
            /
          </span>
          <span>{project.host}</span>
        </div>
      </div>
    </article>
  );

  if (project.href.startsWith("/")) {
    return (
      <Link to={project.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={project.href} className={className}>
      {content}
    </a>
  );
}
