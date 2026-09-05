"use client";

import { AnimatePresence, motion } from "motion/react";
import { type ComponentProps, useLayoutEffect, useState } from "react";
import { useCommonChart } from "./common-context";
import { cn } from "./lib";
import { rgb } from "./palette";

export type TooltipVariant = "default" | "frosted-glass";

const VARIANT: Record<TooltipVariant, string> = {
  default: "bg-popover",
  "frosted-glass": "bg-popover/70 backdrop-blur-sm",
};

const DEFAULT_HEIGHT = 96;
const DEFAULT_WIDTH = 192;
const TOP_OFFSET = "-115%";
const BOTTOM_OFFSET = 12;

type TooltipMetrics = {
  height: number;
  width: number;
  clipLeft: number;
  clipRight: number;
  rootLeft: number;
};

/**
 * Floating hover tooltip. Reads the shared common context so it works in every
 * chart family. It glides between points and fades in/out (instead of snapping),
 * and dims unselected series/slices.
 */
export function Tooltip({
  labelKey,
  valueFormatter,
  variant = "default",
}: {
  labelKey?: string;
  valueFormatter?: (value: number, name: string) => string;
  variant?: TooltipVariant;
}) {
  const chart = useCommonChart();
  const show = chart.ready && chart.hoverIndex != null;

  // Retain the last hovered index so the card keeps its content while fading
  // out — adjust-state-during-render (no refs in render).
  const [lastIndex, setLastIndex] = useState(0);
  if (chart.hoverIndex != null && chart.hoverIndex !== lastIndex) {
    setLastIndex(chart.hoverIndex);
  }
  const index = chart.hoverIndex ?? lastIndex;

  const heading = chart.heading(index, labelKey);
  const items = chart.itemsAt(index);
  const [metrics, setMetrics] = useState<TooltipMetrics>({
    height: DEFAULT_HEIGHT,
    width: DEFAULT_WIDTH,
    clipLeft: 0,
    clipRight: typeof window === "undefined" ? DEFAULT_WIDTH : window.innerWidth,
    rootLeft: 0,
  });
  const openBelow = chart.tooltipTop - metrics.height * 1.15 < 0;
  const yOffset = openBelow ? BOTTOM_OFFSET : TOP_OFFSET;
  const xOffset = Math.max(
    metrics.clipLeft - metrics.rootLeft - chart.tooltipLeft,
    Math.min(
      metrics.clipRight - metrics.rootLeft - chart.tooltipLeft - metrics.width,
      -metrics.width / 2,
    ),
  );

  return (
    <AnimatePresence>
      {show && items.length > 0 && (
        <TooltipCard
          key="dither-tooltip"
          onMetricsChange={setMetrics}
          initial={{
            opacity: 0,
            x: xOffset,
            y: yOffset,
            top: chart.tooltipTop,
            left: chart.tooltipLeft,
          }}
          animate={{
            opacity: 1,
            x: xOffset,
            y: yOffset,
            top: chart.tooltipTop,
            left: chart.tooltipLeft,
          }}
          exit={{ opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 520,
            damping: 38,
            mass: 0.6,
          }}
          className={cn(
            "pointer-events-none absolute z-10 max-w-[min(20rem,calc(100vw-2rem))] rounded-md border px-2 py-1 shadow-sm",
            VARIANT[variant],
          )}
        >
          {heading && (
            <div className="mb-0.5 break-words font-mono text-[10px] text-muted-foreground">
              {heading}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 font-mono text-[11px] text-popover-foreground tabular-nums"
                style={{ opacity: item.dimmed ? 0.4 : 1 }}
              >
                <span
                  className="size-2 rounded-[1px]"
                  style={{ backgroundColor: rgb(item.seed.fill) }}
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="ml-auto pl-2 text-foreground">
                  {valueFormatter
                    ? valueFormatter(item.value, item.name)
                    : item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </TooltipCard>
      )}
    </AnimatePresence>
  );
}

Tooltip.chartLayer = "dom" as const;

function TooltipCard({
  onMetricsChange,
  ...props
}: ComponentProps<typeof motion.div> & {
  onMetricsChange: (metrics: TooltipMetrics) => void;
}) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => onMetricsChange(measureTooltip(element));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    globalThis.addEventListener("resize", measure);
    globalThis.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      globalThis.removeEventListener("resize", measure);
      globalThis.removeEventListener("scroll", measure, true);
    };
  }, [element, onMetricsChange]);

  return <motion.div {...props} ref={setElement} />;
}

function measureTooltip(element: HTMLDivElement): TooltipMetrics {
  const card = element.getBoundingClientRect();
  const root =
    element.offsetParent instanceof HTMLElement
      ? element.offsetParent.getBoundingClientRect()
      : { left: 0 };
  const clip = { left: 0, right: window.innerWidth };
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) {
      const rect = parent.getBoundingClientRect();
      clip.left = Math.max(clip.left, rect.left);
      clip.right = Math.min(clip.right, rect.right);
    }
  }
  return {
    height: card.height,
    width: card.width,
    clipLeft: clip.left,
    clipRight: clip.right,
    rootLeft: root.left,
  };
}
