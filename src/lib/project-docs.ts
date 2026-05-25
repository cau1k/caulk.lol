import { notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type {
  ProjectDocsData,
  SerializableTreeRoot,
} from "@/components/project-docs";
import { getProject, type Project } from "@/lib/projects";
import { projects } from "@/lib/source";

function toText(value: ReactNode): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  return undefined;
}

function projectTree(
  project: Project,
  hostMode: boolean,
): SerializableTreeRoot {
  const canonicalPrefix = `/projects/${project.id}`;
  const mapUrl = hostMode
    ? (url: string) => url.replace(canonicalPrefix, "") || "/"
    : (url: string) => url;

  const pages = projects
    .getPages()
    .filter((page) => page.data.project === project.id)
    .sort((a, b) => pageOrder(a.path) - pageOrder(b.path));

  if (pages.length === 0) throw notFound();

  return {
    $id: projects.pageTree.$id,
    name: toText(projects.pageTree.name) ?? project.title,
    children: pages.map((page) => ({
      $id: page.path,
      type: "page",
      name: page.data.title,
      url: mapUrl(canonicalPageUrl(page.url, project)),
      description: page.data.description,
    })),
  };
}

function pageOrder(path: string): number {
  if (path.endsWith("/index.mdx")) return 0;
  if (path.endsWith("/installation.mdx")) return 1;
  if (path.endsWith("/integrations.mdx")) return 2;
  return 10;
}

function canonicalPageUrl(url: string, project: Project): string {
  const indexUrl = `/projects/${project.id}/index`;
  return url === indexUrl ? `/projects/${project.id}` : url;
}

export function getProjectDocsData(
  projectId: string,
  slugs: string[],
  hostMode = false,
): ProjectDocsData {
  const project = getProject(projectId);
  if (!project) throw notFound();

  const targetUrl =
    slugs.length === 0
      ? `/projects/${project.id}`
      : `/projects/${project.id}/${slugs.join("/")}`;
  const page = projects
    .getPages()
    .find(
      (candidate) =>
        candidate.data.project === project.id &&
        (candidate.url === targetUrl ||
          canonicalPageUrl(candidate.url, project) === targetUrl),
    );
  if (!page || page.data.project !== project.id) throw notFound();

  return {
    project,
    path: page.path,
    title: page.data.title,
    author: page.data.author,
    description: page.data.description,
    url: canonicalPageUrl(page.url, project),
    tree: projectTree(project, hostMode),
    hostMode,
  };
}
