import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { notes } from "@/lib/source";

type NoteCategory = "predictions" | "thoughts";

type NoteSummary = {
  url: string;
  title: string;
  description?: string;
  date: Date;
  category: NoteCategory;
  tags: string[];
};

export const Route = createFileRoute("/notes/")({
  loader: () => serverLoader(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  }),
  component: NotesIndex,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const isDev = import.meta.env.DEV;
  const pages = notes.getPages().filter((p) => isDev || !p.data.draft);
  const sorted = pages.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const result: NoteSummary[] = sorted.map((page) => ({
    url: page.url,
    title: page.data.title,
    description: page.data.description,
    date: page.data.date,
    category: page.data.category,
    tags: page.data.tags ?? [],
  }));

  return { notes: result };
});

function NotesIndex() {
  const { notes } = Route.useLoaderData();

  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const sorted = useMemo(() => {
    const list = [...notes];
    list.sort((a, b) =>
      sort === "newest"
        ? b.date.getTime() - a.date.getTime()
        : a.date.getTime() - b.date.getTime(),
    );
    return list;
  }, [notes, sort]);

  const tChart = useMemo(() => {
    const predictions = sorted.filter((n) => n.category === "predictions");
    const thoughts = sorted.filter((n) => n.category === "thoughts");
    return { predictions, thoughts };
  }, [sorted]);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-14">
        <header className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Two columns: predictions and thoughts. Keep it small.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="tabular-nums">{sorted.length}</span> notes
              {sorted[0]?.date && (
                <span className="tabular-nums"> · latest {formatDate(sorted[0].date)}</span>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">Sort</span>
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value === "oldest" ? "oldest" : "newest")
                }
                className={cn(
                  "h-9 rounded-lg border border-border bg-background px-2 text-sm",
                  "outline-none focus-visible:ring-ring/40 focus-visible:ring-4",
                )}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
          </div>
        </header>

        <section>
          {sorted.length === 0 ? (
            <EmptyState
              title="No notes match"
              description="Write a note and it will show up here."
            />
          ) : (
            <TChartView
              predictions={tChart.predictions}
              thoughts={tChart.thoughts}
            />
          )}
        </section>
      </main>
    </HomeLayout>
  );
}

function TChartView({
  predictions,
  thoughts,
}: {
  predictions: NoteSummary[];
  thoughts: NoteSummary[];
}) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border">
        <div className="px-4 py-3 sm:px-6 font-medium">Predictions</div>
        <div className="px-4 py-3 sm:px-6 font-medium md:border-l border-border">
          Thoughts
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <Column notes={predictions} />
        <div className="md:border-l border-border">
          <Column notes={thoughts} />
        </div>
      </div>
    </div>
  );
}

function Column({ notes }: { notes: NoteSummary[] }) {
  return (
    <div className="p-2 sm:p-3">
      {notes.length === 0 ? (
        <div className="px-3 py-10 text-sm text-muted-foreground">—</div>
      ) : (
        <div className="divide-y divide-border">
          {notes.map((note) => (
            <Link
              key={note.url}
              to={note.url}
              className={cn(
                "block rounded-lg px-3 py-3",
                "hover:bg-accent/25 transition-colors",
              )}
            >
              <article>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium leading-snug truncate">
                    {note.title}
                  </h3>
                  <time
                    className="text-xs text-muted-foreground tabular-nums shrink-0"
                    title={formatDateTime(note.date)}
                  >
                    {formatDate(note.date)}
                  </time>
                </div>
                {note.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {note.description}
                  </p>
                )}
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
