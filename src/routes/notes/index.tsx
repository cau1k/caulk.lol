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

  const [view, setView] = useState<"t" | "list">("t");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [enabled, setEnabled] = useState<Record<NoteCategory, boolean>>({
    predictions: true,
    thoughts: true,
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const fromTs = fromDate ? fromDate.getTime() : null;
    const toTs = toDate ? toDate.getTime() : null;

    const withinDateRange = (note: NoteSummary) => {
      const ts = note.date.getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs + 24 * 60 * 60_000 - 1) return false;
      return true;
    };

    const matchesQuery = (note: NoteSummary) => {
      if (!query) return true;
      const parts: string[] = [];
      parts.push(note.title);
      if (note.description) parts.push(note.description);
      if (note.tags.length > 0) parts.push(note.tags.join(" "));
      const haystack = parts.join(" ").toLowerCase();
      return haystack.includes(query);
    };

    const byCategory = (note: NoteSummary) => enabled[note.category];

    const base = notes
      .filter(byCategory)
      .filter(withinDateRange)
      .filter(matchesQuery);

    const sorted = [...base].sort((a, b) =>
      sort === "newest"
        ? b.date.getTime() - a.date.getTime()
        : a.date.getTime() - b.date.getTime(),
    );

    return sorted;
  }, [enabled, from, notes, q, sort, to]);

  const tChart = useMemo(() => {
    const predictions = filtered.filter((n) => n.category === "predictions");
    const thoughts = filtered.filter((n) => n.category === "thoughts");
    return { predictions, thoughts };
  }, [filtered]);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-5xl px-4 py-14">
        <header className="mb-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                Field notes
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Notes
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Short entries. Two lanes. Written down so they can be wrong in
                public.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: "t", label: "T chart" },
                  { value: "list", label: "List" },
                ]}
              />
            </div>
          </div>
        </header>

        <section
          className={cn(
            "rounded-2xl border border-border/70 bg-background/60",
            "shadow-[0_1px_0_0_hsl(var(--border))_inset]",
            "relative overflow-hidden",
            "before:absolute before:inset-0 before:pointer-events-none",
            "before:bg-[radial-gradient(circle_at_18%_22%,hsl(var(--primary)/0.10),transparent_52%),radial-gradient(circle_at_82%_30%,hsl(var(--secondary)/0.12),transparent_55%),linear-gradient(to_bottom,hsl(var(--background)/0.6),hsl(var(--background)/0.2))]",
            "after:absolute after:inset-0 after:pointer-events-none after:opacity-20",
            "after:bg-[linear-gradient(to_bottom,transparent,transparent_9px,hsl(var(--border))_10px),linear-gradient(to_right,transparent,transparent_9px,hsl(var(--border))_10px)]",
            "after:bg-[length:100%_10px,10px_100%]",
          )}
        >
          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  pressed={enabled.predictions}
                  onPressedChange={(pressed) =>
                    setEnabled((prev) => ({ ...prev, predictions: pressed }))
                  }
                  label="Predictions"
                  tone="warn"
                />
                <FilterChip
                  pressed={enabled.thoughts}
                  onPressedChange={(pressed) =>
                    setEnabled((prev) => ({ ...prev, thoughts: pressed }))
                  }
                  label="Thoughts"
                  tone="ok"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filter: title, description, tags"
                    className={cn(
                      "h-10 w-full sm:w-64 rounded-xl border border-border bg-background/80 px-3",
                      "text-sm outline-none",
                      "focus-visible:ring-ring/40 focus-visible:ring-4",
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <DateInput label="From" value={from} onChange={setFrom} />
                  <DateInput label="To" value={to} onChange={setTo} />
                </div>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value === "oldest" ? "oldest" : "newest")
                  }
                  className={cn(
                    "h-10 rounded-xl border border-border bg-background/80 px-3 text-sm",
                    "outline-none focus-visible:ring-ring/40 focus-visible:ring-4",
                  )}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setFrom("");
                    setTo("");
                    setEnabled({ predictions: true, thoughts: true });
                    setSort("newest");
                  }}
                  className={cn(
                    "h-10 rounded-xl border border-border bg-background/70 px-3 text-sm",
                    "text-muted-foreground hover:text-foreground hover:bg-background transition-colors",
                  )}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} notes</span>
              <span className="tabular-nums">
                {filtered[0]?.date && (
                  <>Latest: {formatDate(filtered[0].date)}</>
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-10">
          {filtered.length === 0 ? (
            <EmptyState
              title="No notes match"
              description="Try widening the date range or clearing filters."
              action={{ label: "Clear filters", to: "/notes" }}
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
    <div
      className={cn(
        "relative rounded-2xl border border-border overflow-hidden",
        "bg-background/60",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 pointer-events-none hidden lg:block",
          "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-border",
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Lane
          title="Predictions"
          subtitle="Things I expect to happen"
          tone="warn"
          notes={predictions}
        />
        <Lane
          title="Thoughts"
          subtitle="Things I want to remember"
          tone="ok"
          notes={thoughts}
        />
      </div>
    </div>
  );
}

function Lane({
  title,
  subtitle,
  tone,
  notes,
}: {
  title: string;
  subtitle: string;
  tone: "warn" | "ok";
  notes: NoteSummary[];
}) {
  const headerGlow =
    tone === "warn"
      ? "from-amber-500/12 via-transparent to-transparent"
      : "from-emerald-500/12 via-transparent to-transparent";

  return (
    <section className="relative">
      <div
        className={cn(
          "px-4 py-4 sm:px-6 sm:py-5",
          "border-b border-border",
          "bg-[linear-gradient(to_bottom,hsl(var(--background)/0.7),hsl(var(--background)/0.4))]",
        )}
      >
        <div className={cn("absolute inset-0 pointer-events-none", "bg-gradient-to-br", headerGlow)} />
        <div className="relative">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold tracking-tight">{title}</h2>
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {notes.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted-foreground">
            Nothing here with the current filters.
          </p>
        ) : (
          <div className="grid gap-2">
            {notes.map((note) => (
              <Link
                key={note.url}
                to={note.url}
                className={cn(
                  "group rounded-xl border border-border bg-background/80",
                  "px-3 py-3",
                  "hover:bg-accent/35 hover:border-border/80",
                  "transition-colors",
                )}
              >
                <article>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <time
                          className="text-[0.70rem] tabular-nums text-muted-foreground"
                          title={formatDateTime(note.date)}
                        >
                          {formatDate(note.date)}
                        </time>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <CategoryStamp category={note.category} />
                      </div>
                      <h3 className="mt-1 font-medium leading-snug group-hover:text-primary transition-colors">
                        {note.title}
                      </h3>
                      {note.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {note.description}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
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

function FilterChip({
  pressed,
  onPressedChange,
  label,
  tone,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  label: string;
  tone: "warn" | "ok";
}) {
  const activeRing =
    tone === "warn"
      ? "data-[pressed=true]:ring-amber-500/35"
      : "data-[pressed=true]:ring-emerald-500/35";
  const activeBg =
    tone === "warn"
      ? "data-[pressed=true]:bg-amber-500/10"
      : "data-[pressed=true]:bg-emerald-500/10";

  return (
    <button
      type="button"
      data-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "h-10 rounded-xl border border-border bg-background/70 px-3 text-sm",
        "text-muted-foreground hover:text-foreground",
        "ring-0 data-[pressed=true]:text-foreground data-[pressed=true]:ring-4 transition-colors",
        activeRing,
        activeBg,
      )}
    >
      {label}
    </button>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 h-10">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "bg-transparent text-sm outline-none",
          "[color-scheme:light] dark:[color-scheme:dark]",
        )}
      />
    </label>
  );
}

function CategoryStamp({ category }: { category: NoteCategory }) {
  const classes =
    category === "predictions"
      ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
      : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5",
        "text-[0.70rem] tracking-wide uppercase",
        classes,
      )}
    >
      {category}
    </span>
  );
}
