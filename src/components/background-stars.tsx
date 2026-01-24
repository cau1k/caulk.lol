"use client";

import { memo, useCallback, useEffect, useRef } from "react";

/**
 * Refined star background that integrates with the site's academic aesthetic.
 * Uses muted colors, subtle animations, and theme-aware rendering.
 */

type Star = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: StarColor;
};

type StarColor = "muted" | "accent" | "primary";

const STAR_CONFIG = {
  density: 0.00008,
  minSize: 1,
  maxSize: 2.5,
  minOpacity: 0.15,
  maxOpacity: 0.6,
  twinkleChance: 0.4,
  primaryChance: 0.03,
  accentChance: 0.08,
} as const;

function getStarColor(color: StarColor, isDark: boolean): string {
  switch (color) {
    case "primary":
      return isDark ? "rgba(120, 220, 160, 0.9)" : "rgba(60, 140, 90, 0.7)";
    case "accent":
      return isDark ? "rgba(180, 200, 220, 0.7)" : "rgba(100, 120, 140, 0.5)";
    case "muted":
    default:
      return isDark ? "rgba(200, 200, 210, 0.5)" : "rgba(80, 80, 90, 0.25)";
  }
}

function createStar(width: number, height: number): Star {
  const rand = Math.random();
  let color: StarColor = "muted";
  if (rand < STAR_CONFIG.primaryChance) {
    color = "primary";
  } else if (rand < STAR_CONFIG.primaryChance + STAR_CONFIG.accentChance) {
    color = "accent";
  }

  const baseOpacity =
    STAR_CONFIG.minOpacity +
    Math.random() * (STAR_CONFIG.maxOpacity - STAR_CONFIG.minOpacity);

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size:
      STAR_CONFIG.minSize +
      Math.random() * (STAR_CONFIG.maxSize - STAR_CONFIG.minSize),
    opacity: baseOpacity,
    baseOpacity,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.3 + Math.random() * 0.7,
    color,
  };
}

export const BackgroundStars = memo(
  function BackgroundStars() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const starsRef = useRef<Star[]>([]);
    const animationRef = useRef<number | null>(null);
    const isDarkRef = useRef<boolean>(true);

    const initStars = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const area = canvas.width * canvas.height;
      const count = Math.floor(area * STAR_CONFIG.density);
      starsRef.current = Array.from({ length: count }, () =>
        createStar(canvas.width, canvas.height)
      );
    }, []);

    const updateTheme = useCallback(() => {
      isDarkRef.current =
        document.documentElement.classList.contains("dark");
    }, []);

    const animate = useCallback((time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = isDarkRef.current;
      const timeSeconds = time / 1000;

      for (const star of starsRef.current) {
        if (Math.random() < STAR_CONFIG.twinkleChance / 60) {
          const twinkle = Math.sin(
            timeSeconds * star.twinkleSpeed + star.twinklePhase
          );
          star.opacity = star.baseOpacity * (0.6 + 0.4 * twinkle);
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = getStarColor(star.color, isDark);
        ctx.globalAlpha = star.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initStars();
      };

      resize();
      updateTheme();
      animationRef.current = requestAnimationFrame(animate);

      const themeObserver = new MutationObserver(updateTheme);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      window.addEventListener("resize", resize);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        themeObserver.disconnect();
        window.removeEventListener("resize", resize);
      };
    }, [animate, initStars, updateTheme]);

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 -z-10"
      />
    );
  },
  () => true
);
