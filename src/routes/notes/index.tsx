import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { baseOptions } from "@/lib/layout.shared";
import { notes } from "@/lib/source";

type NoteCategory = "predictions" | "thoughts";

type NoteSummary = {
  url: string;
  title: string;
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
        <header className="mb-6 flex items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "h-9 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2",
                "text-sm text-foreground",
                "outline-ring transition-colors focus-visible:outline-2",
                "hover:bg-accent/25",
              )}
            >
              <span className="text-xs text-muted-foreground">Sort</span>
              <span className="tabular-nums">
                {sort === "newest" ? "Newest" : "Oldest"}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) =>
                  setSort(value === "oldest" ? "oldest" : "newest")
                }
              >
                <DropdownMenuRadioItem value="newest">
                  Newest
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  Oldest
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <section>
          {sorted.length === 0 ? (
            <EmptyState title="No notes" />
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
      <div className="grid grid-cols-1 md:grid-cols-2">
        <section>
          <div className="px-4 py-3 sm:px-6 font-medium border-b border-border">
            Predictions
          </div>
          <Column notes={predictions} />
        </section>

        <section className="border-t md:border-t-0 md:border-l border-border">
          <div className="px-4 py-3 sm:px-6 font-medium border-b border-border">
            Thoughts
          </div>
          <Column notes={thoughts} />
        </section>
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
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
