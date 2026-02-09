import browserCollections from "fumadocs-mdx:collections/browser";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HomeLayout } from "@/components/layout/home";
import { TagBadge } from "@/components/tag-badge";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { notes } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

type NoteCategory = "predictions" | "thoughts";

export const Route = createFileRoute("/notes/$slug")({
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.slug });
    await clientLoader.preload(data.path);
    return data;
  },
  staleTime: Infinity,
  gcTime: 30 * 60_000,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=604800",
  }),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const description = loaderData.description ?? "";

    return {
      meta: [
        { title: `${loaderData.title} - Notes` },
        { name: "description", content: description },
      ],
    };
  },
  component: NotePage,
});

const serverLoader = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const page = notes.getPage([slug]);
    if (!page) throw notFound();

    const isDev = import.meta.env.DEV;
    if (page.data.draft && !isDev) throw notFound();

    return {
      slug,
      path: page.path,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      date: page.data.date,
      updatedAt: page.data.updatedAt,
      category: page.data.category,
      tags: page.data.tags ?? [],
    };
  });

const clientLoader = browserCollections.notes.createClientLoader({
  component({ default: MDX }) {
    return (
      <div className="prose prose-fd max-w-none overflow-x-hidden">
        <MDX components={getMDXComponents()} />
      </div>
    );
  },
});

function NotePage() {
  const data = Route.useLoaderData();
  const Content = clientLoader.getComponent(data.path);
  const ContentRenderer = () => Content(undefined);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-14">
        <header className="mb-10">
          <div className="flex items-center gap-2">
            <CategoryStamp category={data.category} />
            <time
              className="text-xs text-muted-foreground tabular-nums"
              title={formatDateTime(data.date)}
            >
              {formatDate(data.date)}
            </time>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {data.title}
          </h1>
          {data.description && (
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          )}
        </header>

        <article
          className={cn(
            "rounded-2xl border border-border bg-background/60 p-5 sm:p-7",
            "shadow-[0_1px_0_0_hsl(var(--border))_inset]",
          )}
        >
          <ContentRenderer />
        </article>
      </main>
    </HomeLayout>
  );
}

function CategoryStamp({ category }: { category: NoteCategory }) {
  const singular = category === "predictions" ? "prediction" : "thought";
  return <TagBadge tag={singular} linked={false} size="sm" />;
}
