"use client";
import * as Primitive from "fumadocs-core/toc";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { cn } from "../../lib/cn";
import { useTOCItems } from "./index";

const ITEM_HEIGHT = 32;
const VISIBLE_COUNT = 9;

function getItemOffset(depth: number): number {
  if (depth <= 2) return 12;
  if (depth === 3) return 24;
  return 36;
}

export function WheelTOCItems({ className, ...props }: ComponentProps<"div">) {
  const items = useTOCItems();
  const active = Primitive.useActiveAnchors();
  const wheelRef = useRef<HTMLUListElement>(null);
  const highlightRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Calculate wheel geometry
  const itemAngle = 360 / Math.max(VISIBLE_COUNT * 2, items.length + 4);
  const radius = ITEM_HEIGHT / Math.tan((itemAngle * Math.PI) / 180);
  const containerHeight = Math.min(
    VISIBLE_COUNT * ITEM_HEIGHT,
    Math.round(radius * 2 + ITEM_HEIGHT * 0.25),
  );
  const quarterCount = Math.floor(VISIBLE_COUNT / 2);

  // Find active index
  const activeIndex = useMemo(() => {
    if (active.length === 0) return 0;
    const idx = items.findIndex((item) => item.url === `#${active[0]}`);
    return idx >= 0 ? idx : 0;
  }, [active, items]);

  // Apply wheel transform at a given scroll position
  const applyTransform = useCallback(
    (scroll: number) => {
      if (!wheelRef.current || !highlightRef.current) return;

      // Rotate wheel
      wheelRef.current.style.transform = `translateZ(${-radius}px) rotateX(${itemAngle * scroll}deg)`;

      // Translate highlight list
      highlightRef.current.style.transform = `translateY(${-scroll * ITEM_HEIGHT}px)`;

      // Toggle visibility based on distance from center
      wheelRef.current.childNodes.forEach((node) => {
        const li = node as HTMLLIElement;
        const idx = Number(li.dataset.index);
        const distance = Math.abs(idx - scroll);
        li.style.visibility =
          distance > quarterCount + 1 ? "hidden" : "visible";
        li.style.opacity = String(Math.max(0, 1 - distance * 0.2));
      });
    },
    [radius, itemAngle, quarterCount],
  );

  // Animate wheel to active position
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startScroll = scrollRef.current;
    const targetScroll = activeIndex;

    if (Math.abs(startScroll - targetScroll) < 0.01) {
      scrollRef.current = targetScroll;
      applyTransform(targetScroll);
      return;
    }

    const startTime = performance.now();
    const duration = 300;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out-cubic

      const newScroll = startScroll + (targetScroll - startScroll) * eased;
      scrollRef.current = newScroll;
      applyTransform(newScroll);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeIndex, applyTransform]);

  // Initial render
  useEffect(() => {
    applyTransform(scrollRef.current);
  }, [applyTransform]);

  const handleItemClick = (index: number) => {
    const item = items[index];
    if (item) {
      const el = document.getElementById(item.url.slice(1));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        No headings found
      </div>
    );
  }

  return (
    <div
      className={cn("relative select-none overflow-hidden", className)}
      style={{
        height: containerHeight,
        perspective: "1000px",
      }}
      {...props}
    >
      {/* 3D wheel layer */}
      <ul
        ref={wheelRef}
        className="absolute inset-x-0 top-1/2 will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {items.map((item, index) => (
          <li
            key={item.url}
            data-index={index}
            className="absolute inset-x-0 flex items-center text-sm text-fd-muted-foreground transition-opacity"
            style={{
              height: ITEM_HEIGHT,
              top: -ITEM_HEIGHT / 2,
              transform: `rotateX(${-itemAngle * index}deg) translateZ(${radius}px)`,
              paddingInlineStart: getItemOffset(item.depth),
            }}
          >
            <button
              type="button"
              onClick={() => handleItemClick(index)}
              className="truncate text-left hover:text-fd-foreground transition-colors"
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>

      {/* Highlight window - shows active item clearly */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 overflow-hidden rounded-sm bg-fd-accent/50"
        style={{
          height: ITEM_HEIGHT,
          marginTop: -ITEM_HEIGHT / 2,
        }}
      >
        <ul
          ref={highlightRef}
          className="will-change-transform"
          style={{
            paddingTop: containerHeight / 2 - ITEM_HEIGHT / 2,
          }}
        >
          {items.map((item) => (
            <li
              key={item.url}
              className="flex items-center text-sm font-medium text-fd-primary"
              style={{
                height: ITEM_HEIGHT,
                paddingInlineStart: getItemOffset(item.depth),
              }}
            >
              <span className="truncate">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Fade mask gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-fd-background) 0%, transparent 25%, transparent 75%, var(--color-fd-background) 100%)",
        }}
      />
    </div>
  );
}
