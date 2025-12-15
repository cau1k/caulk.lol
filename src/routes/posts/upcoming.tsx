import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion, useAnimationControls } from "motion/react";
import { RotateCcw } from "lucide-react";
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
  resetting,
  index,
}: {
  cell: Cell;
  revealed: boolean;
  resetting: boolean;
  index: number;
}) {
  const controls = useAnimationControls();
  const [currentState, setCurrentState] = useState(cell.state);

  // Reset animation - fade in with shuffle
  useEffect(() => {
    if (!resetting) return;

    const baseDelay = index * 0.002;
    controls.set({ opacity: 0 });

    const timeout = setTimeout(
      () => {
        controls.start({
          opacity: 1,
          transition: { duration: 0.2 },
        });

        // Shuffle to new random state
        const r = Math.random();
        if (r < 0.12) setCurrentState("active");
        else if (r < 0.4) setCurrentState("muted");
        else setCurrentState("empty");
      },
      baseDelay * 1000 + Math.random() * 150,
    );

    return () => clearTimeout(timeout);
  }, [resetting, controls, index]);

  // Reveal animation - shuffle then fade out
  useEffect(() => {
    if (!revealed || resetting) return;

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
  }, [revealed, resetting, controls, index]);

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
  revealed,
  resetting,
  onReveal,
}: {
  title: string;
  description?: string;
  revealed: boolean;
  resetting: boolean;
  onReveal: () => void;
}) {
  const [showContent, setShowContent] = useState(false);
  const [grid, setGrid] = useState(() => generateGrid());

  // Handle reveal animation timing
  useEffect(() => {
    if (revealed && !resetting) {
      const timeout = setTimeout(() => setShowContent(true), 600);
      return () => clearTimeout(timeout);
    }
  }, [revealed, resetting]);

  // Handle reset
  useEffect(() => {
    if (resetting) {
      setShowContent(false);
      setGrid(generateGrid());
    }
  }, [resetting]);

  const handleReveal = () => {
    if (!revealed && !resetting) {
      onReveal();
    }
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
          className={`absolute inset-0 flex flex-col justify-center gap-[3px] transition-opacity duration-300 ${
            showContent ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {grid.map((row) => (
            <div key={row[0].id.split("-")[0]} className="flex gap-[3px]">
              {row.map((cell, colIdx) => (
                <SwitchboardCell
                  key={cell.id}
                  cell={cell}
                  revealed={revealed}
                  resetting={resetting}
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
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);

  const allRevealed = posts.length > 0 && revealedSet.size === posts.length;

  const handleReveal = useCallback((title: string) => {
    setRevealedSet((prev) => new Set([...prev, title]));
  }, []);

  const handleReset = useCallback(() => {
    setResetting(true);
    setRevealedSet(new Set());

    // Allow reset animation to complete
    setTimeout(() => setResetting(false), 400);
  }, []);

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
                revealed={revealedSet.has(post.title)}
                resetting={resetting}
                onReveal={() => handleReveal(post.title)}
              />
            ))}
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex justify-between text-sm text-muted-foreground">
            <Link
              to="/posts"
              className="hover:text-foreground transition-colors"
            >
              ← All writing
            </Link>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: allRevealed ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-1.5 hover:text-foreground transition-colors ${
                allRevealed ? "pointer-events-auto" : "pointer-events-none"
              }`}
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3" />
              Refresh
            </motion.button>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
