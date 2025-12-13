"use client";
import * as Primitive from "fumadocs-core/toc";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);
  const velocityRef = useRef(0);
  const lastDragY = useRef(0);
  const lastDragTime = useRef(0);
  const isUserControlling = useRef(false);

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
      if (!wheelRef.current) return;

      // Rotate wheel
      wheelRef.current.style.transform = `translateZ(${-radius}px) rotateX(${itemAngle * scroll}deg)`;

      // Toggle visibility and style based on distance from center
      wheelRef.current.childNodes.forEach((node) => {
        const li = node as HTMLLIElement;
        const idx = Number(li.dataset.index);
        const distance = Math.abs(idx - scroll);
        const isActive = distance < 0.5;

        li.style.visibility =
          distance > quarterCount + 1 ? "hidden" : "visible";
        li.style.opacity = String(Math.max(0, 1 - distance * 0.15));

        // Style active item
        if (isActive) {
          li.classList.add("text-fd-primary", "font-medium");
          li.classList.remove("text-fd-muted-foreground");
        } else {
          li.classList.remove("text-fd-primary", "font-medium");
          li.classList.add("text-fd-muted-foreground");
        }
      });
    },
    [radius, itemAngle, quarterCount],
  );

  // Scroll page to item at given index
  const scrollToItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        const el = document.getElementById(item.url.slice(1));
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [items],
  );

  // Animate wheel with momentum after drag release
  const animateMomentum = useCallback(
    (initialVelocity: number) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const friction = 0.95;
      let velocity = initialVelocity;

      const animate = () => {
        velocity *= friction;

        if (Math.abs(velocity) < 0.01) {
          // Snap to nearest item and scroll page
          const targetIndex = Math.round(scrollRef.current);
          const clampedIndex = Math.max(
            0,
            Math.min(items.length - 1, targetIndex),
          );
          scrollRef.current = clampedIndex;
          applyTransform(clampedIndex);
          scrollToItem(clampedIndex);
          isUserControlling.current = false;
          return;
        }

        scrollRef.current += velocity;
        // Clamp scroll position
        scrollRef.current = Math.max(
          -0.5,
          Math.min(items.length - 0.5, scrollRef.current),
        );
        applyTransform(scrollRef.current);

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [applyTransform, items.length, scrollToItem],
  );

  // Drag handlers
  const handleDragStart = useCallback((clientY: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    isUserControlling.current = true;
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartScroll.current = scrollRef.current;
    lastDragY.current = clientY;
    lastDragTime.current = performance.now();
    velocityRef.current = 0;
  }, []);

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isUserControlling.current) return;

      const now = performance.now();
      const deltaY = clientY - lastDragY.current;
      const deltaTime = now - lastDragTime.current;

      // Calculate velocity (items per ms)
      if (deltaTime > 0) {
        velocityRef.current = (-deltaY / ITEM_HEIGHT) * (16 / deltaTime);
      }

      lastDragY.current = clientY;
      lastDragTime.current = now;

      // Update scroll position based on drag distance
      const totalDeltaY = clientY - dragStartY.current;
      const scrollDelta = -totalDeltaY / ITEM_HEIGHT;
      let newScroll = dragStartScroll.current + scrollDelta;

      // Clamp with rubber band effect at edges
      newScroll = Math.max(-0.5, Math.min(items.length - 0.5, newScroll));
      scrollRef.current = newScroll;
      applyTransform(newScroll);
    },
    [applyTransform, items.length],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    animateMomentum(velocityRef.current);
  }, [animateMomentum]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);
    },
    [handleDragStart],
  );

  // Global mouse move/up handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) handleDragStart(touch.clientY);
    },
    [handleDragStart],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) handleDragMove(touch.clientY);
    },
    [handleDragMove],
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Animate wheel to active position (only when not user-controlled)
  useEffect(() => {
    if (isUserControlling.current) return;

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
      if (isUserControlling.current) return;

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
    scrollToItem(index);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        No headings found
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: wheel picker is a custom interactive element
    <div
      ref={containerRef}
      role="listbox"
      tabIndex={0}
      className={cn(
        "relative overflow-hidden",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{
        height: containerHeight,
        perspective: "1000px",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {/* 3D wheel layer */}
      <ul
        ref={wheelRef}
        className="pointer-events-none absolute inset-x-0 top-1/2 select-none will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {items.map((item, index) => (
          <li
            key={item.url}
            data-index={index}
            className="pointer-events-auto absolute inset-x-0 flex items-center text-sm text-fd-muted-foreground transition-colors"
            style={{
              height: ITEM_HEIGHT,
              top: -ITEM_HEIGHT / 2,
              transform: `rotateX(${-itemAngle * index}deg) translateZ(${radius}px)`,
              paddingInlineStart: getItemOffset(item.depth),
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(index);
              }}
              className="truncate text-left transition-colors hover:text-fd-foreground"
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>

      {/* Center highlight bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 rounded-sm bg-fd-accent/30"
        style={{
          height: ITEM_HEIGHT,
          marginTop: -ITEM_HEIGHT / 2,
        }}
      />

      {/* Fade mask gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-fd-background) 0%, transparent 20%, transparent 80%, var(--color-fd-background) 100%)",
        }}
      />
    </div>
  );
}
