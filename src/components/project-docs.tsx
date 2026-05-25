import browserCollections from "fumadocs-mdx:collections/browser";
import type * as PageTree from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import { useEffect, useMemo, useRef } from "react";
import { PostLayout, usePostTOC } from "@/components/layout/post";
import { TOCProvider } from "@/components/toc";
import { WheelTOCItems } from "@/components/toc/wheel";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";
import type { Project } from "@/lib/projects";
import { getMDXComponents } from "@/mdx-components";

export type SerializableTreeItem = Omit<
  PageTree.Item,
  "name" | "description" | "icon"
> & {
  name: string;
  description?: string;
  icon?: string;
};

export type SerializableTreeNode =
  | SerializableTreeItem
  | (Omit<
      PageTree.Folder,
      "name" | "description" | "icon" | "index" | "children"
    > & {
      name: string;
      description?: string;
      icon?: string;
      index?: SerializableTreeItem;
      children: SerializableTreeNode[];
    })
  | (Omit<PageTree.Separator, "name" | "icon"> & {
      name?: string;
      icon?: string;
    });

export type SerializableTreeRoot = Omit<
  PageTree.Root,
  "name" | "children" | "fallback"
> & {
  name: string;
  children: SerializableTreeNode[];
};

export type ProjectDocsData = {
  project: Project;
  path: string;
  title: string;
  author: string;
  description?: string;
  url: string;
  tree: SerializableTreeRoot;
  hostMode: boolean;
};

export const projectClientLoader =
  browserCollections.projects.createClientLoader({
    component({ toc, default: MDX }) {
      return (
        <ProjectContent toc={toc}>
          <MDX components={getMDXComponents()} />
        </ProjectContent>
      );
    },
  });

export async function preloadProjectContent(path: string) {
  await projectClientLoader.preload(path);
}

export function ProjectDocs({ data }: { data: ProjectDocsData }) {
  const Content = projectClientLoader.getComponent(data.path);
  const ContentRenderer = () => Content(undefined);
  const { previous, next } = useProjectNavigation(data);

  return (
    <PostLayout {...baseOptions()}>
      <article className="relative mx-auto w-full max-w-2xl px-4 py-16 sm:py-20">
        <header className="mb-12">
          <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Project</span>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span>{data.author}</span>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span className="capitalize">{data.project.status}</span>
          </div>

          <h1 className="py-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {data.title}
          </h1>

          {data.description ? (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {data.description}
            </p>
          ) : null}

          <div className="mt-8 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <a
              href={data.project.githubUrl}
              className="hover:text-foreground"
              rel="noreferrer"
              target="_blank"
            >
              {data.project.githubUrl.replace("https://github.com/", "")}
            </a>
            <span className="text-muted-foreground/40" aria-hidden>
              /
            </span>
            <a
              href={`https://${data.project.host}`}
              className="hover:text-foreground"
            >
              {data.project.host}
            </a>
          </div>

          <div className="mt-8 h-px w-full bg-border" />
        </header>

        <ContentRenderer />
        <ProjectNavigation previous={previous} next={next} />
      </article>
      <ProjectSidebarTOC />
    </PostLayout>
  );
}

function ProjectContent({
  toc,
  children,
}: {
  toc?: TOCItemType[];
  children: React.ReactNode;
}) {
  const { setToc, setContentVisible } = usePostTOC();

  useEffect(() => {
    setToc(toc ?? []);
    return () => setToc([]);
  }, [toc, setToc]);

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
    <div className="prose prose-fd max-w-none overflow-x-hidden">
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      {children}
    </div>
  );
}

export function ProjectSidebarTOC() {
  const { toc } = usePostTOC();
  if (toc.length === 0) return null;

  return (
    <TOCProvider toc={toc}>
      <aside className="fixed top-16 right-[max(1rem,calc((100vw-42rem)/2-16rem))] hidden w-56 xl:flex xl:flex-col shadow-none">
        <WheelTOCItems />
      </aside>
    </TOCProvider>
  );
}

type ProjectNavLink = {
  url: string;
  title: string;
} | null;

function useProjectNavigation(data: ProjectDocsData): {
  previous: ProjectNavLink;
  next: ProjectNavLink;
} {
  return useMemo(() => {
    const pages = data.tree.children
      .filter((item): item is SerializableTreeItem => item.type === "page")
      .map((item) => ({
        url: item.url,
        title: item.name,
      }));
    const index = pages.findIndex((page) => page.url === data.url);

    return {
      previous: index > 0 ? pages[index - 1] : null,
      next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : null,
    };
  }, [data.tree.children, data.url]);
}

function ProjectNavigation({
  previous,
  next,
}: {
  previous: ProjectNavLink;
  next: ProjectNavLink;
}) {
  if (!previous && !next) return null;

  return (
    <nav className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-8">
      {previous ? (
        <ProjectNavAnchor direction="previous" href={previous.url}>
          {previous.title}
        </ProjectNavAnchor>
      ) : (
        <div />
      )}
      {next ? (
        <ProjectNavAnchor direction="next" href={next.url}>
          {next.title}
        </ProjectNavAnchor>
      ) : (
        <div />
      )}
    </nav>
  );
}

function ProjectNavAnchor({
  direction,
  href,
  children,
}: {
  direction: "previous" | "next";
  href: string;
  children: React.ReactNode;
}) {
  const isNext = direction === "next";

  return (
    <a
      href={href}
      className={cn(
        "group flex gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        isNext ? "items-center justify-end text-right" : "items-center",
      )}
    >
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide">
          {isNext ? "Next" : "Previous"}
        </div>
        <div className="truncate font-medium text-foreground">{children}</div>
      </div>
    </a>
  );
}
