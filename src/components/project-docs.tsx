import browserCollections from "fumadocs-mdx:collections/browser";
import type * as PageTree from "fumadocs-core/page-tree";
import { DocsLayout } from "@/components/layout/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "@/components/layout/docs/page";
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
  description?: string;
  tree: SerializableTreeRoot;
  hostMode: boolean;
};

export const projectClientLoader =
  browserCollections.projects.createClientLoader({
    component({ toc, default: MDX }) {
      return (
        <DocsPage toc={toc}>
          <DocsBody className="prose-fd max-w-none overflow-x-hidden">
            <MDX components={getMDXComponents()} />
          </DocsBody>
        </DocsPage>
      );
    },
  });

export async function preloadProjectContent(path: string) {
  await projectClientLoader.preload(path);
}

export function ProjectDocs({ data }: { data: ProjectDocsData }) {
  const Content = projectClientLoader.getComponent(data.path);
  const ContentRenderer = () => Content(undefined);
  const homeHref = data.hostMode ? "/" : `/projects/${data.project.id}`;

  return (
    <DocsLayout
      tree={data.tree as PageTree.Root}
      title={data.project.title}
      homeHref={homeHref}
    >
      <div className="flex w-full min-w-0 flex-col">
        <article className="flex w-full max-w-[860px] flex-col gap-3 px-4 pt-8 md:mx-auto md:px-6">
          <p className="text-sm text-muted-foreground">
            <a
              href={data.project.githubUrl}
              className="hover:text-foreground"
              rel="noreferrer"
              target="_blank"
            >
              {data.project.githubUrl.replace("https://github.com/", "")}
            </a>
          </p>
          <DocsTitle>{data.title}</DocsTitle>
          <DocsDescription>{data.description}</DocsDescription>
        </article>
        <ContentRenderer />
      </div>
    </DocsLayout>
  );
}
