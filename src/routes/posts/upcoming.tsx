import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
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

const COLS = 48;
const ROWS = 4;

type CellState = "empty" | "muted" | "active";
type Post = { title: string; description?: string };

function generateGrid(): CellState[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => {
      const r = Math.random();
      if (r < 0.12) return "active";
      if (r < 0.4) return "muted";
      return "empty";
    }),
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function SwitchboardReveal({
  post,
  revealed,
  onReveal,
  disabled,
  layoutId,
}: {
  post: Post;
  revealed: boolean;
  onReveal: () => void;
  disabled: boolean;
  layoutId: string;
}) {
  const [grid, setGrid] = useState(() => generateGrid());
  const [clearedCols, setClearedCols] = useState<Set<number>>(new Set());
  const [shufflingCells, setShufflingCells] = useState<Map<string, CellState>>(
    new Map(),
  );
  const [revealProgress, setRevealProgress] = useState(0);

  const { title, description } = post;
  const fullText = description ? `${title}|${description}` : title;
  const totalChars = fullText.length;

  // Reveal animation
  useEffect(() => {
    if (!revealed) return;

    const totalDuration = 900;
    const colDelay = totalDuration / COLS;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (let col = 0; col < COLS; col++) {
      const shuffleTimeout = setTimeout(
        () => {
          for (let row = 0; row < ROWS; row++) {
            const cellId = `${row}-${col}`;
            const states: CellState[] = ["empty", "muted", "active"];
            setShufflingCells((prev) => {
              const next = new Map(prev);
              next.set(cellId, states[Math.floor(Math.random() * 3)]);
              return next;
            });
          }
        },
        col * colDelay + Math.random() * 20,
      );
      timeouts.push(shuffleTimeout);

      const clearTimeout = setTimeout(
        () => {
          setClearedCols((prev) => new Set([...prev, col]));
          const progress = Math.floor(((col + 1) / COLS) * totalChars);
          setRevealProgress(progress);
        },
        col * colDelay + 50 + Math.random() * 30,
      );
      timeouts.push(clearTimeout);
    }

    const finalTimeout = setTimeout(() => {
      setRevealProgress(totalChars);
    }, totalDuration + 100);
    timeouts.push(finalTimeout);

    return () => timeouts.forEach(clearTimeout);
  }, [revealed, totalChars]);

  // Reset grid when not revealed (for shuffle)
  useEffect(() => {
    if (!revealed) {
      setClearedCols(new Set());
      setShufflingCells(new Map());
      setRevealProgress(0);
      setGrid(generateGrid());
    }
  }, [revealed]);

  const handleClick = () => {
    if (!revealed && !disabled) onReveal();
  };

  const titleChars = title.split("");
  const descChars = description?.split("") ?? [];

  return (
    <motion.button
      type="button"
      layout
      layoutId={layoutId}
      className={`group w-full text-left transition-opacity ${
        disabled && !revealed
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer"
      }`}
      onClick={handleClick}
      disabled={disabled && !revealed}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
    >
      <div className="relative h-[52px] overflow-hidden">
        {/* Pixelated grid */}
        <div className="absolute inset-0 flex flex-col justify-center gap-[2px]">
          {grid.map((row, rowIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable grid
            <div key={rowIdx} className="flex gap-[2px]">
              {row.map((cellState, colIdx) => {
                const cellId = `${rowIdx}-${colIdx}`;
                const isCleared = clearedCols.has(colIdx);
                const shuffledState = shufflingCells.get(cellId);
                const displayState = shuffledState ?? cellState;

                return (
                  <motion.div
                    key={cellId}
                    className={`w-[6px] h-[6px] rounded-[1px] transition-colors duration-50 ${
                      displayState === "active"
                        ? "bg-foreground"
                        : displayState === "muted"
                          ? "bg-muted-foreground/60"
                          : "bg-muted-foreground/20"
                    }`}
                    animate={{
                      opacity: isCleared ? 0 : 1,
                      scale: isCleared ? 0.5 : 1,
                    }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
          <div className="font-medium font-sans text-foreground/80 leading-tight">
            {titleChars.map((char, i) => (
              <span
                key={`t${i}${char}`}
                className="transition-opacity duration-75"
                style={{ opacity: i < revealProgress ? 1 : 0 }}
              >
                {char}
              </span>
            ))}
          </div>
          {description && (
            <div className="mt-0.5 text-sm text-muted-foreground leading-tight">
              {descChars.map((char, i) => {
                const charIndex = titleChars.length + 1 + i;
                return (
                  <span
                    key={`d${i}${char}`}
                    className="transition-opacity duration-75"
                    style={{ opacity: charIndex < revealProgress ? 1 : 0 }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function UpcomingPosts() {
  const { posts: originalPosts } = Route.useLoaderData();
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set());
  const [shuffledOrder, setShuffledOrder] = useState<Post[]>([]);

  const maxReveals = Math.max(1, Math.ceil(originalPosts.length * 0.33));
  const revealsRemaining = maxReveals - revealedSet.size;
  const outOfReveals = revealsRemaining <= 0;

  // Initial shuffle
  useEffect(() => {
    setShuffledOrder(shuffleArray(originalPosts));
  }, [originalPosts]);

  const handleReveal = useCallback((title: string) => {
    setRevealedSet((prev) => new Set([...prev, title]));
  }, []);

  const handleReset = useCallback(() => {
    setRevealedSet(new Set());
    setShuffledOrder(shuffleArray(originalPosts));
  }, [originalPosts]);

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold font-serif tracking-tight">
            Upcoming
          </h1>
          {originalPosts.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {outOfReveals
                ? "No reveals left"
                : `${revealsRemaining} reveal${revealsRemaining === 1 ? "" : "s"} remaining`}
            </p>
          )}
        </header>

        {originalPosts.length === 0 ? (
          <EmptyState
            title="Nothing in the pipeline"
            description="All caught up! Check back later for new content."
            action={{ label: "Back to home", to: "/" }}
          />
        ) : (
          <div className="space-y-2">
            {shuffledOrder.map((post) => (
              <SwitchboardReveal
                key={post.title}
                layoutId={post.title}
                post={post}
                revealed={revealedSet.has(post.title)}
                disabled={outOfReveals}
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
              animate={{ opacity: revealedSet.size > 0 ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-1.5 hover:text-foreground transition-colors ${
                revealedSet.size > 0
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              }`}
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </motion.button>
          </div>
        </footer>
      </main>
    </HomeLayout>
  );
}
