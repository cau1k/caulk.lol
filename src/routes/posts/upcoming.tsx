import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion, useAnimationControls } from "motion/react";
import { EmptyState } from "@/components/empty-state";
import { HomeLayout } from "@/components/layout/home";
import { baseOptions } from "@/lib/layout.shared";
import { posts } from "@/lib/source";

export const Route = createFileRoute("/posts/upcoming")({
  loader: () => serverLoader(),
  component: UpcomingPosts,
});

const serverLoader = createServerFn({ method: "GET" }).handler(async () => {
  const drafts = posts.getPages().filter((p) => p.data.draft);
  const sorted = drafts.sort((a, b) => {
    const dateA = a.data.date ? new Date(a.data.date).getTime() : 0;
    const dateB = b.data.date ? new Date(b.data.date).getTime() : 0;
    return dateB - dateA;
  });

  return {
    posts: sorted.map((page) => ({
      title: page.data.title,
      description: page.data.description,
    })),
  };
});

const COLS = 32;
const ROWS = 4;

type CellState = "empty" | "muted" | "active";
type Cell = { state: CellState; id: string };

function generateGrid(): Cell[][] {
  return Array.from({ length: ROWS }, (_, rowIdx) =>
    Array.from({ length: COLS }, (_, colIdx) => {
      const r = Math.random();
      let state: CellState = "empty";
      if (r < 0.12) state = "active";
      else if (r < 0.4) state = "muted";
      return { state, id: `${rowIdx}-${colIdx}` };
    }),
  );
}

function SwitchboardCell({
  cell,
  revealed,
  index,
}: {
  cell: Cell;
  revealed: boolean;
  index: number;
}) {
  const controls = useAnimationControls();
  const [currentState, setCurrentState] = useState(cell.state);

  useEffect(() => {
    if (!revealed) return;

    // Shuffle animation - cells randomly change states before fading
    const shuffleCount = 3 + Math.floor(Math.random() * 4);
    const baseDelay = index * 0.003;
    let step = 0;

    const interval = setInterval(
      () => {
        if (step < shuffleCount) {
          const states: CellState[] = ["empty", "muted", "active"];
          setCurrentState(states[Math.floor(Math.random() * 3)]);
          step++;
        } else {
          clearInterval(interval);
          controls.start({
            opacity: 0,
            transition: {
              duration: 0.3,
              delay: baseDelay + Math.random() * 0.2,
            },
          });
        }
      },
      60 + Math.random() * 40,
    );

    return () => clearInterval(interval);
  }, [revealed, controls, index]);

  return (
    <motion.div
      animate={controls}
      className={`w-[6px] h-[6px] rounded-[1px] transition-colors duration-75 ${
        currentState === "active"
          ? "bg-foreground"
          : currentState === "muted"
            ? "bg-muted-foreground/60"
            : "bg-muted-foreground/20"
      }`}
    />
  );
}

function SwitchboardReveal({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const grid = useMemo(() => generateGrid(), []);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    // Delay content reveal until shuffle animation completes
    setTimeout(() => setShowContent(true), 600);
  };

  return (
    <button
      type="button"
      className="group cursor-pointer w-full text-left"
      onClick={handleReveal}
      onMouseEnter={handleReveal}
    >
      {/* Fixed height container */}
      <div className="relative h-[52px] overflow-hidden">
        {/* Pixelated grid */}
        <div
          className={`absolute inset-0 flex flex-col gap-[3px] transition-opacity duration-300 ${
            showContent ? "opacity-0" : "opacity-100"
          }`}
        >
          {grid.map((row) => (
            <div key={row[0].id.split("-")[0]} className="flex gap-[3px]">
              {row.map((cell, colIdx) => (
                <SwitchboardCell
                  key={cell.id}
                  cell={cell}
                  revealed={revealed}
                  index={Number(cell.id.split("-")[0]) * COLS + colIdx}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-300 ${
            showContent ? "opacity-100" : "opacity-0"
          }`}
        >
          <h2 className="font-medium font-sans text-foreground/80 leading-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground leading-tight line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function UpcomingPosts() {
  const { posts } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold font-serif tracking-tight">
            Upcoming
          </h1>
        </header>

        {posts.length === 0 ? (
          <EmptyState
            title="Nothing in the pipeline"
            description="All caught up! Check back later for new content."
            action={{ label: "Back to home", to: "/" }}
          />
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <SwitchboardReveal
                key={post.title}
                title={post.title}
                description={post.description}
              />
            ))}
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-border">
          <Link
            to="/posts"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All writing
          </Link>
        </footer>
      </main>
    </HomeLayout>
  );
}
