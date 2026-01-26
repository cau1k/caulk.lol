"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Graph, GraphViewProps } from "./graph-view-content";

export type { Graph, GraphViewProps };

const GraphViewContent = lazy(() =>
  import("./graph-view-content").then((m) => ({ default: m.GraphViewContent })),
);

export function GraphView(props: GraphViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);

  useEffect(() => {
    setMount(true);
  }, []);

  return (
    <div
      ref={ref}
      className="relative border h-[600px] [&_canvas]:size-full rounded-xl overflow-hidden"
    >
      {mount && (
        <Suspense
          fallback={<div className="animate-pulse h-full bg-muted rounded" />}
        >
          <GraphViewContent {...props} containerRef={ref} />
        </Suspense>
      )}
    </div>
  );
}
