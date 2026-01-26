"use client";

import { Suspense, lazy, useEffect, useState } from "react";

const MermaidContent = lazy(() =>
  import("./mermaid-content").then((m) => ({ default: m.MermaidContent })),
);

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded" />}>
      <MermaidContent chart={chart} />
    </Suspense>
  );
}
