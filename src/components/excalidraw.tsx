"use client";

import { useEffect, useRef, useState } from "react";

type ExcalidrawProps = {
  src: string;
  alt?: string;
  className?: string;
};

// Semantic colors to preserve (green=good, red=bad)
const PRESERVE_COLORS = new Set([
  "#2f9e44", "#40c057", "#69db7c", "#b2f2bb", // greens
  "#e03131", "#f03e3e", "#ff8787", // reds
]);

// Grays/blacks -> foreground
const NEUTRAL_COLORS = new Set([
  "#1e1e1e", "#202020", "#000000", "#212529", "#343a40", "#495057",
]);

// Light grays -> muted
const MUTED_COLORS = new Set([
  "#ced4da", "#868e96", "#adb5bd",
]);

// Background grays
const BG_COLORS = new Set([
  "#e9ecef", "#f8f9fa", "#dee2e6",
]);

function transformSvgStyles(svg: SVGSVGElement): void {
  // Replace Excalidraw fonts with theme font
  const style = document.createElement("style");
  style.textContent = `text { font-family: "CMU Sans Serif", sans-serif !important; }`;
  svg.prepend(style);

  const elements = svg.querySelectorAll("[stroke], [fill]");

  for (const el of elements) {
    const stroke = el.getAttribute("stroke")?.toLowerCase();
    const fill = el.getAttribute("fill")?.toLowerCase();

    if (stroke && !PRESERVE_COLORS.has(stroke)) {
      if (NEUTRAL_COLORS.has(stroke)) {
        el.setAttribute("stroke", "var(--foreground)");
      } else if (MUTED_COLORS.has(stroke)) {
        el.setAttribute("stroke", "var(--muted-foreground)");
      }
    }

    if (fill && fill !== "none" && !PRESERVE_COLORS.has(fill)) {
      if (NEUTRAL_COLORS.has(fill)) {
        el.setAttribute("fill", "var(--foreground)");
      } else if (MUTED_COLORS.has(fill)) {
        el.setAttribute("fill", "var(--muted-foreground)");
      } else if (BG_COLORS.has(fill)) {
        el.setAttribute("fill", "var(--muted)");
      } else if (fill === "#ffffff") {
        el.setAttribute("fill", "var(--background)");
      }
    }
  }

  // Handle text elements
  const texts = svg.querySelectorAll("text");
  for (const text of texts) {
    const fill = text.getAttribute("fill")?.toLowerCase();
    if (fill && !PRESERVE_COLORS.has(fill)) {
      if (NEUTRAL_COLORS.has(fill)) {
        text.setAttribute("fill", "var(--foreground)");
      } else if (MUTED_COLORS.has(fill)) {
        text.setAttribute("fill", "var(--muted-foreground)");
      }
    }
  }
}

export function Excalidraw({ src, alt, className }: ExcalidrawProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const loadExcalidraw = async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to fetch ${src}`);
        const fileContent = await res.text();

        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const data = JSON.parse(fileContent);

        const svg = await exportToSvg({
          elements: data.elements,
          files: data.files,
          appState: {
            exportBackground: false,
            ...data.appState,
          },
        });

        transformSvgStyles(svg);

        if (alt) svg.setAttribute("aria-label", alt);
        svg.style.width = "100%";
        svg.style.height = "auto";

        containerRef.current?.replaceChildren(svg);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load excalidraw");
      }
    };

    loadExcalidraw();
  }, [src, alt]);

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }

  return <div ref={containerRef} className={className} />;
}
