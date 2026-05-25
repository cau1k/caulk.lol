import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { TOCItemType } from "fumadocs-core/toc";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/empty-state";
import { PostLayout, usePostTOC } from "@/components/layout/post";
import { ProjectSidebarTOC } from "@/components/project-docs";
import { baseOptions } from "@/lib/layout.shared";
import { type Project, projectRegistry } from "@/lib/projects";

type ProjectListItem = Project & {
  href: string;
};

const projectsToc: TOCItemType[] = [
  { title: "Active Projects", url: "#active-projects", depth: 2 },
];

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
  const isDev = import.meta.env.DEV;
  const projects = Object.values(projectRegistry)
    .filter((project) => project.status === "active")
    .map((project) => ({
      ...project,
      href: isDev ? `/projects/${project.id}` : `https://${project.host}`,
    }));

  return { projects };
});

function ProjectsIndex() {
  return (
    <PostLayout {...baseOptions()}>
      <ProjectsIndexContent projects={Route.useLoaderData().projects} />
      <ProjectSidebarTOC />
    </PostLayout>
  );
}

function ProjectsIndexContent({ projects }: { projects: ProjectListItem[] }) {
  const { setToc, setContentVisible } = usePostTOC();

  useEffect(() => {
    setToc(projectsToc);
    return () => setToc([]);
  }, [setToc]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setContentVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [setContentVisible]);

  return (
    <article className="relative mx-auto w-full max-w-2xl px-4 py-16 sm:py-20">
      <header className="mb-12">
        <div className="mb-6 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Index</span>
          <span className="text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <span>{projects.length} active</span>
        </div>

        <h1 className="py-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Projects
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Active project docs, integration notes, and implementation overviews.
        </p>

        <div className="mt-8 h-px w-full bg-border" />
      </header>

      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <section id="active-projects" className="scroll-m-28">
        <h2 className="mb-4 text-xl font-semibold">Active Projects</h2>

        {projects.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Project docs are on the way."
          />
        ) : (
          <div className="group/list">
            {projects.map((project) => (
              <a
                key={project.id}
                href={project.href}
                className="group/item block -mx-3 rounded-lg px-4 py-4 transition-all duration-200 ease-out group-has-hover/list:opacity-50 hover:opacity-100!"
              >
                <article className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
                  <div className="shrink-0 text-sm text-muted-foreground sm:w-28">
                    {project.status}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium font-sans transition-colors group-hover/item:text-primary">
                      {project.title}
                    </h3>
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
              </a>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
