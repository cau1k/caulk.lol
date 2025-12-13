"use client";
import type { TOCItemType } from "fumadocs-core/toc";
import * as Primitive from "fumadocs-core/toc";
import {
  type MotionValue,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
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
const MIN_VISIBLE = 5;
const MAX_VISIBLE = 9;

// Velocity tuning - adjust these to change drag/release feel
const VELOCITY_MULTIPLIER = 1.5; // Amplifies drag velocity
const RELEASE_PROJECTION = 12; // How far ahead to project on release
const SPRING_VELOCITY_SCALE = 80; // Initial velocity for spring animation

function getItemOffset(depth: number): number {
  if (depth <= 2) return 12;
  if (depth === 3) return 24;
  return 36;
}

export function WheelTOCItems({ className, ...props }: ComponentProps<"div">) {
  const items = useTOCItems();
  const active = Primitive.useActiveAnchors();
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion value for wheel scroll position (in item units)
  const scrollPosition = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const isUserControlling = useRef(false);

  // Drag tracking
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);
  const lastDragY = useRef(0);
  const lastDragTime = useRef(0);
  const velocityRef = useRef(0);

  // Track last scrolled item to avoid redundant scrolls
  const lastScrolledIndex = useRef(-1);

  // Track active scroll animation so we can cancel it
  const scrollAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

  // Adjust visible count based on number of items (between MIN and MAX)
  const visibleCount = Math.max(
    MIN_VISIBLE,
    Math.min(MAX_VISIBLE, items.length + 2),
  );

  // Calculate wheel geometry
  const itemAngle = 360 / Math.max(visibleCount * 2, items.length + 4);
  const radius = ITEM_HEIGHT / Math.tan((itemAngle * Math.PI) / 180);
  const containerHeight = Math.min(
    visibleCount * ITEM_HEIGHT,
    Math.round(radius * 2 + ITEM_HEIGHT * 0.25),
  );
  const quarterCount = Math.floor(visibleCount / 2);

  // Transform scroll position to wheel rotation
  const wheelRotation = useTransform(
    scrollPosition,
    (scroll) => `translateZ(${-radius}px) rotateX(${itemAngle * scroll}deg)`,
  );

  // Find active index from page scroll
  const activeIndex = useMemo(() => {
    if (active.length === 0) return 0;
    const idx = items.findIndex((item) => item.url === `#${active[0]}`);
    return idx >= 0 ? idx : 0;
  }, [active, items]);

  // Scroll page to item using motion animate for cancellable smooth scrolling
  const scrollToItem = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const item = items[clampedIndex];
      if (!item) return;

      const el = document.getElementById(item.url.slice(1));
      if (!el) return;

      // Calculate target scroll position
      const targetY = el.getBoundingClientRect().top + window.scrollY;

      // Cancel any existing scroll animation
      if (scrollAnimationRef.current) {
        scrollAnimationRef.current.stop();
      }

      // Animate scroll with motion - this is cancellable and doesn't queue
      scrollAnimationRef.current = animate(window.scrollY, targetY, {
        type: "spring",
        stiffness: 200,
        damping: 30,
        mass: 0.5,
        onUpdate: (value) => window.scrollTo(0, value),
      });
    },
    [items],
  );

  // Subscribe to scroll position changes during user control
  useEffect(() => {
    const unsubscribe = scrollPosition.on("change", (value) => {
      if (!isUserControlling.current || items.length === 0) return;

      const nearestIndex = Math.round(value);
      const clampedIndex = Math.max(
        0,
        Math.min(items.length - 1, nearestIndex),
      );

      if (clampedIndex !== lastScrolledIndex.current) {
        lastScrolledIndex.current = clampedIndex;
        scrollToItem(clampedIndex);
      }
    });

    return unsubscribe;
  }, [scrollPosition, items.length, scrollToItem]);

  // Animate wheel to position with wobble effect
  const animateToPosition = useCallback(
    (targetIndex: number, withWobble = false) => {
      if (items.length === 0) return;

      const clampedTarget = Math.max(
        0,
        Math.min(items.length - 1, targetIndex),
      );

      if (withWobble) {
        animate(scrollPosition, clampedTarget, {
          type: "spring",
          stiffness: 400,
          damping: 25,
          mass: 0.8,
          velocity: velocityRef.current * SPRING_VELOCITY_SCALE,
        });
      } else {
        animate(scrollPosition, clampedTarget, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        });
      }

      scrollToItem(clampedTarget);
    },
    [scrollPosition, items.length, scrollToItem],
  );

  // Handle momentum after drag release
  const handleRelease = useCallback(() => {
    if (items.length === 0) return;

    const currentPos = scrollPosition.get();
    const velocity = velocityRef.current;

    // Project where we'd end up based on velocity, then clamp
    const projectedEnd = currentPos + velocity * RELEASE_PROJECTION;
    const targetIndex = Math.round(projectedEnd);
    const clampedTarget = Math.max(0, Math.min(items.length - 1, targetIndex));

    // Animate with spring physics (wobble effect)
    animate(scrollPosition, clampedTarget, {
      type: "spring",
      stiffness: 300,
      damping: 20,
      mass: 1,
      velocity: velocity * SPRING_VELOCITY_SCALE,
      onComplete: () => {
        // Delay releasing user control to let page scroll settle
        // This prevents the sync effect from fighting with the wheel
        setTimeout(() => {
          isUserControlling.current = false;
          lastScrolledIndex.current = -1;
        }, 150);
      },
    });

    scrollToItem(clampedTarget);
  }, [scrollPosition, items.length, scrollToItem]);

  // Drag handlers
  const handleDragStart = useCallback(
    (clientY: number) => {
      isUserControlling.current = true;
      setIsDragging(true);
      dragStartY.current = clientY;
      dragStartScroll.current = scrollPosition.get();
      lastDragY.current = clientY;
      lastDragTime.current = performance.now();
      velocityRef.current = 0;
    },
    [scrollPosition],
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isUserControlling.current || items.length === 0) return;

      const now = performance.now();
      const deltaY = clientY - lastDragY.current;
      const deltaTime = now - lastDragTime.current;

      // Calculate velocity with multiplier
      if (deltaTime > 0) {
        const instantVelocity =
          (-deltaY / ITEM_HEIGHT) * (16 / deltaTime) * VELOCITY_MULTIPLIER;
        velocityRef.current = velocityRef.current * 0.7 + instantVelocity * 0.3;
      }

      lastDragY.current = clientY;
      lastDragTime.current = now;

      // Update scroll position with soft boundaries (rubber band at edges)
      const totalDeltaY = clientY - dragStartY.current;
      const scrollDelta = -totalDeltaY / ITEM_HEIGHT;
      let newScroll = dragStartScroll.current + scrollDelta;

      // Soft clamp with resistance at edges
      const minScroll = -0.3;
      const maxScroll = items.length - 0.7;
      if (newScroll < minScroll) {
        newScroll = minScroll + (newScroll - minScroll) * 0.3;
      } else if (newScroll > maxScroll) {
        newScroll = maxScroll + (newScroll - maxScroll) * 0.3;
      }

      scrollPosition.set(newScroll);
    },
    [scrollPosition, items.length],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    handleRelease();
  }, [handleRelease]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);
    },
    [handleDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const handleMouseUp = () => handleDragEnd();

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

  // Sync wheel to page scroll (when not user-controlled)
  useEffect(() => {
    if (isUserControlling.current || items.length === 0) return;

    animate(scrollPosition, activeIndex, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
  }, [activeIndex, scrollPosition, items.length]);

  // Item click handler
  const handleItemClick = useCallback(
    (index: number) => {
      isUserControlling.current = true;
      animateToPosition(index, true);
      setTimeout(() => {
        isUserControlling.current = false;
      }, 500);
    },
    [animateToPosition],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        No headings found
      </div>
    );
  }

  return (
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
      {/* 3D wheel */}
      <motion.ul
        className="pointer-events-none absolute inset-x-0 top-1/2 select-none will-change-transform"
        style={{
          transform: wheelRotation,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        {items.map((item, index) => (
          <WheelItem
            key={item.url}
            item={item}
            index={index}
            scrollPosition={scrollPosition}
            itemAngle={itemAngle}
            radius={radius}
            quarterCount={quarterCount}
            onItemClick={handleItemClick}
          />
        ))}
      </motion.ul>

      {/* Center highlight bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 rounded-sm bg-fd-accent/30"
        style={{
          height: ITEM_HEIGHT,
          marginTop: -ITEM_HEIGHT / 2,
        }}
      />

      {/* Fade mask */}
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

// Individual wheel item with reactive opacity/styling
function WheelItem({
  item,
  index,
  scrollPosition,
  itemAngle,
  radius,
  quarterCount,
  onItemClick,
}: {
  item: TOCItemType;
  index: number;
  scrollPosition: MotionValue<number>;
  itemAngle: number;
  radius: number;
  quarterCount: number;
  onItemClick: (index: number) => void;
}) {
  const opacity = useTransform(scrollPosition, (scroll) => {
    const distance = Math.abs(index - scroll);
    if (distance > quarterCount + 1) return 0;
    return Math.max(0, 1 - distance * 0.15);
  });

  const isActive = useTransform(scrollPosition, (scroll) => {
    return Math.abs(index - scroll) < 0.5;
  });

  // Track active state for styling
  const [active, setActive] = useState(false);
  useEffect(() => {
    return isActive.on("change", setActive);
  }, [isActive]);

  return (
    <motion.li
      className={cn(
        "pointer-events-auto absolute inset-x-0 flex items-center text-sm transition-colors",
        active ? "font-medium text-fd-primary" : "text-fd-muted-foreground",
      )}
      style={{
        height: ITEM_HEIGHT,
        top: -ITEM_HEIGHT / 2,
        transform: `rotateX(${-itemAngle * index}deg) translateZ(${radius}px)`,
        paddingInlineStart: getItemOffset(item.depth),
        opacity,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onItemClick(index);
        }}
        className="truncate text-left transition-colors hover:text-fd-foreground"
      >
        {item.title}
      </button>
    </motion.li>
  );
}
