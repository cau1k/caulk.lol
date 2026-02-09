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

type CategoryFilter = "all" | NoteCategory;

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

  const [view, setView] = useState<"t" | "list">("t");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [since, setSince] = useState("");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const parseDateInput = (value: string): number | null => {
      if (!value) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
      const d = new Date(`${value}T00:00:00`);
      const ts = d.getTime();
      return Number.isNaN(ts) ? null : ts;
    };

    const query = q.trim().toLowerCase();
    const sinceTs = parseDateInput(since);

    const matchesCategory = (note: NoteSummary) =>
      category === "all" ? true : note.category === category;

    const matchesSince = (note: NoteSummary) => {
      if (sinceTs == null) return true;
      return note.date.getTime() >= sinceTs;
    };

    const matchesQuery = (note: NoteSummary) => {
      if (!query) return true;
      const haystack = `${note.title} ${note.description ?? ""} ${note.tags.join(" ")}`
        .trim()
        .toLowerCase();
      return haystack.includes(query);
    };

    return notes
      .filter(matchesCategory)
      .filter(matchesSince)
      .filter(matchesQuery)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [category, notes, q, since]);

  const tChart = useMemo(() => {
    const predictions = filtered.filter((n) => n.category === "predictions");
    const thoughts = filtered.filter((n) => n.category === "thoughts");
    return { predictions, thoughts };
  }, [filtered]);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-5xl px-4 py-14">
        <header className="mb-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Two columns: predictions and thoughts. Keep it small.
              </p>
            </div>

            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "t", label: "T" },
                { value: "list", label: "List" },
              ]}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: "All" },
                  { value: "predictions", label: "Predictions" },
                  { value: "thoughts", label: "Thoughts" },
                ]}
              />
              <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 h-10">
                <span className="text-xs text-muted-foreground">Since</span>
                <input
                  type="date"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  className={cn(
                    "bg-transparent text-sm outline-none",
                    "[color-scheme:light] dark:[color-scheme:dark]",
                  )}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className={cn(
                  "h-10 w-full sm:w-64 rounded-xl border border-border bg-background px-3",
                  "text-sm outline-none",
                  "focus-visible:ring-ring/40 focus-visible:ring-4",
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setCategory("all");
                  setSince("");
                  setQ("");
                }}
                className={cn(
                  "h-10 rounded-xl border border-border bg-background px-3 text-sm",
                  "text-muted-foreground hover:text-foreground transition-colors",
                )}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <span className="tabular-nums">{filtered.length}</span> notes
            {filtered[0]?.date && (
              <span className="tabular-nums"> · latest {formatDate(filtered[0].date)}</span>
            )}
          </div>
        </header>

        <section>
          {filtered.length === 0 ? (
            <EmptyState
              title="No notes match"
              description="Try clearing search or removing the date filter."
              action={{ label: "Reset", to: "/notes" }}
            />
          ) : view === "list" ? (
            <ListView notes={filtered} />
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

function ListView({ notes }: { notes: NoteSummary[] }) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {notes.map((note) => (
          <Link
            key={note.url}
            to={note.url}
            className={cn(
              "block px-4 py-4 sm:px-6",
              "bg-background hover:bg-accent/30 transition-colors",
            )}
          >
            <article className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
              <time
                className="text-xs text-muted-foreground tabular-nums shrink-0 sm:w-28"
                title={formatDateTime(note.date)}
              >
                {formatDate(note.date)}
              </time>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CategoryStamp category={note.category} />
                  <h2 className="font-medium truncate">{note.title}</h2>
                </div>
                {note.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {note.description}
                  </p>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
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

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-background/70 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          data-active={opt.value === value}
          className={cn(
            "h-9 rounded-lg px-3 text-sm transition-colors",
            "text-muted-foreground hover:text-foreground",
            "data-[active=true]:bg-accent/50 data-[active=true]:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CategoryStamp({ category }: { category: NoteCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border px-2 py-0.5",
        "text-[0.70rem] tracking-wide uppercase text-muted-foreground",
      )}
    >
      {category}
    </span>
  );
}
