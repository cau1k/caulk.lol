"use client";

import { useEffect, useRef, useState } from "react";

type ExcalidrawProps = {
  src: string;
  alt?: string;
  subtitle?: string;
  className?: string;
};

// Map Excalidraw colors to CSS variables
const COLOR_MAP: Record<string, string> = {
  // Greens -> primary
  "#2f9e44": "var(--primary)",
  "#40c057": "var(--primary)",
  "#69db7c": "var(--primary)",
  "#b2f2bb": "var(--primary)",
  "#087f5b": "var(--primary)",
  "#0ca678": "var(--primary)",
  "#38d9a9": "var(--primary)",
  "#96f2d7": "var(--primary)",

  // Reds -> destructive
  "#e03131": "var(--destructive)",
  "#f03e3e": "var(--destructive)",
  "#ff8787": "var(--destructive)",
  "#c92a2a": "var(--destructive)",
  "#fa5252": "var(--destructive)",
  "#ffc9c9": "var(--destructive)",

  // Blues -> chart-1
  "#1864ab": "var(--chart-1)",
  "#1971c2": "var(--chart-1)",
  "#228be6": "var(--chart-1)",
  "#4dabf7": "var(--chart-1)",
  "#a5d8ff": "var(--chart-1)",
  "#1c7ed6": "var(--chart-1)",

  // Oranges -> chart-2
  "#d9480f": "var(--chart-2)",
  "#e8590c": "var(--chart-2)",
  "#f76707": "var(--chart-2)",
  "#fd7e14": "var(--chart-2)",
  "#ff922b": "var(--chart-2)",
  "#ffc078": "var(--chart-2)",

  // Yellows -> chart-1
  "#e67700": "var(--chart-1)",
  "#f59f00": "var(--chart-1)",
  "#fab005": "var(--chart-1)",
  "#fcc419": "var(--chart-1)",
  "#ffd43b": "var(--chart-1)",
  "#ffe066": "var(--chart-1)",

  // Violets/purples -> chart-3
  "#5f3dc4": "var(--chart-3)",
  "#6741d9": "var(--chart-3)",
  "#7048e8": "var(--chart-3)",
  "#7950f2": "var(--chart-3)",
  "#845ef7": "var(--chart-3)",
  "#9775fa": "var(--chart-3)",
  "#b197fc": "var(--chart-3)",

  // Pinks -> chart-4
  "#a61e4d": "var(--chart-4)",
  "#c2255c": "var(--chart-4)",
  "#d6336c": "var(--chart-4)",
  "#e64980": "var(--chart-4)",
  "#f06595": "var(--chart-4)",
  "#f783ac": "var(--chart-4)",

  // Cyans -> chart-5
  "#0b7285": "var(--chart-5)",
  "#0c8599": "var(--chart-5)",
  "#1098ad": "var(--chart-5)",
  "#15aabf": "var(--chart-5)",
  "#22b8cf": "var(--chart-5)",
  "#3bc9db": "var(--chart-5)",

  // Grays/blacks -> foreground
  "#1e1e1e": "var(--foreground)",
  "#202020": "var(--foreground)",
  "#000000": "var(--foreground)",
  "#212529": "var(--foreground)",
  "#343a40": "var(--foreground)",
  "#495057": "var(--foreground)",

  // Light grays -> muted-foreground
  "#ced4da": "var(--muted-foreground)",
  "#868e96": "var(--muted-foreground)",
  "#adb5bd": "var(--muted-foreground)",

  // Background grays -> muted
  "#e9ecef": "var(--muted)",
  "#f8f9fa": "var(--muted)",
  "#dee2e6": "var(--muted)",

  // White -> background
  "#ffffff": "var(--background)",
};

function transformSvgStyles(svg: SVGSVGElement): void {
  // Replace Excalidraw fonts with theme font
  const style = document.createElement("style");
  style.textContent = `
    text, tspan, [font-family] { 
      font-family: var(--font-serif) !important; 
    }
  `;
  svg.prepend(style);

  // Strip inline font-family attributes
  const textEls = svg.querySelectorAll("text, tspan, [font-family]");
  for (const el of textEls) {
    el.removeAttribute("font-family");
  }

  const elements = svg.querySelectorAll("[stroke], [fill]");

  for (const el of elements) {
    const stroke = el.getAttribute("stroke")?.toLowerCase();
    const fill = el.getAttribute("fill")?.toLowerCase();

    if (stroke && COLOR_MAP[stroke]) {
      el.setAttribute("stroke", COLOR_MAP[stroke]);
    }

    if (fill && fill !== "none" && COLOR_MAP[fill]) {
      el.setAttribute("fill", COLOR_MAP[fill]);
    }
  }

  // Handle text elements
  const texts = svg.querySelectorAll("text");
  for (const text of texts) {
    const fill = text.getAttribute("fill")?.toLowerCase();
    if (fill && COLOR_MAP[fill]) {
      text.setAttribute("fill", COLOR_MAP[fill]);
    }
  }
}

export function Excalidraw({ src, alt, subtitle, className }: ExcalidrawProps) {
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

  return (
    <figure className={className}>
      <div ref={containerRef} />
      {subtitle && (
        <figcaption className="text-muted-foreground mt-2 text-center text-sm">
          {subtitle}
        </figcaption>
      )}
    </figure>
  );
}
