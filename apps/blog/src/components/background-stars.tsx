"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import {
  type CanvasSize,
  createShootingStar,
  createStar,
  drawStaticFrame,
  renderShootingStars,
  renderStars,
  SHOOTING_STAR_CONFIG,
  type ShootingStar,
  STAR_CONFIG,
  type Star,
} from "@/lib/stars";
import { useBackgroundStarsOptional } from "./background-stars-context";

function getViewportSize(): CanvasSize {
  const root = document.documentElement;

  return {
    width: Math.max(1, Math.floor(root.clientWidth)),
    height: Math.max(1, Math.floor(root.clientHeight)),
  };
}

export const BackgroundStars = memo(
  function BackgroundStars() {
    const ctx = useBackgroundStarsOptional();
    const paused = ctx?.paused ?? false;

    const starsCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const asteroidCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const starsRef = useRef<Star[]>([]);
    const shootingStarsRef = useRef<ShootingStar[]>([]);
    const animationRef = useRef<number | null>(null);
    const isDarkRef = useRef<boolean>(true);
    const nextShootingStarRef = useRef<number>(0);
    const pausedRef = useRef(paused);
    // Retained pixels must be repainted after initialization, theme, resize, or resume.
    const starsDirtyRef = useRef(true);
    const canvasSizeRef = useRef<CanvasSize>({ width: 0, height: 0 });

    useEffect(() => {
      pausedRef.current = paused;
      if (!paused) starsDirtyRef.current = true;

      if (paused) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      }
    }, [paused]);

    const initStars = useCallback(() => {
      const canvas = starsCanvasRef.current;
      if (!canvas) return;

      starsDirtyRef.current = true;
      const area = canvas.width * canvas.height;
      const count = Math.floor(area * STAR_CONFIG.density);
      starsRef.current = Array.from({ length: count }, () =>
        createStar(canvas.width, canvas.height),
      );
    }, []);

    const updateTheme = useCallback(() => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDarkRef.current !== isDark) starsDirtyRef.current = true;
      isDarkRef.current = isDark;

      if (pausedRef.current) {
        const starsCanvas = starsCanvasRef.current;
        const asteroidCanvas = asteroidCanvasRef.current;
        const starsCtx = starsCanvas?.getContext("2d");
        const asteroidCtx = asteroidCanvas?.getContext("2d");
        if (starsCanvas && asteroidCanvas && starsCtx && asteroidCtx) {
          starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
          if (shootingStarsRef.current.length > 0) {
            asteroidCtx.clearRect(0, 0, asteroidCanvas.width, asteroidCanvas.height);
          }
          drawStaticFrame(
            starsCtx,
            asteroidCtx,
            starsRef.current,
            shootingStarsRef.current,
            isDarkRef.current,
          );
        }
      }
    }, []);

    const animate = useCallback((time: number) => {
      if (pausedRef.current) {
        return;
      }

      const starsCanvas = starsCanvasRef.current;
      const asteroidCanvas = asteroidCanvasRef.current;
      const starsCtx = starsCanvas?.getContext("2d");
      const asteroidCtx = asteroidCanvas?.getContext("2d");
      if (!starsCanvas || !asteroidCanvas || !starsCtx || !asteroidCtx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const isDark = isDarkRef.current;
      renderStars(starsCtx, starsRef.current, time, isDark, starsDirtyRef.current);
      starsDirtyRef.current = false;

      if (
        time > nextShootingStarRef.current &&
        shootingStarsRef.current.length < SHOOTING_STAR_CONFIG.maxActive
      ) {
        shootingStarsRef.current.push(createShootingStar(starsCanvas.width));
        nextShootingStarRef.current =
          time +
          SHOOTING_STAR_CONFIG.minInterval +
          Math.random() * (SHOOTING_STAR_CONFIG.maxInterval - SHOOTING_STAR_CONFIG.minInterval);
      }

      shootingStarsRef.current = renderShootingStars(asteroidCtx, shootingStarsRef.current, isDark);

      animationRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
      const starsCanvas = starsCanvasRef.current;
      const asteroidCanvas = asteroidCanvasRef.current;
      if (!starsCanvas || !asteroidCanvas) return;

      const resize = () => {
        const viewportSize = getViewportSize();

        if (
          canvasSizeRef.current.width === viewportSize.width &&
          canvasSizeRef.current.height === viewportSize.height
        ) {
          return;
        }

        canvasSizeRef.current = viewportSize;
        starsCanvas.width = viewportSize.width;
        starsCanvas.height = viewportSize.height;
        asteroidCanvas.width = viewportSize.width;
        asteroidCanvas.height = viewportSize.height;
        initStars();

        if (pausedRef.current) {
          const starsCtx = starsCanvas.getContext("2d");
          const asteroidCtx = asteroidCanvas.getContext("2d");
          if (starsCtx && asteroidCtx) {
            starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
            if (shootingStarsRef.current.length > 0) {
              asteroidCtx.clearRect(0, 0, asteroidCanvas.width, asteroidCanvas.height);
            }
            drawStaticFrame(
              starsCtx,
              asteroidCtx,
              starsRef.current,
              shootingStarsRef.current,
              isDarkRef.current,
            );
          }
        }
      };

      resize();
      updateTheme();
      nextShootingStarRef.current = performance.now() + 1000 + Math.random() * 2000;

      if (!pausedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        const starsCtx = starsCanvas.getContext("2d");
        const asteroidCtx = asteroidCanvas.getContext("2d");
        if (starsCtx && asteroidCtx) {
          drawStaticFrame(
            starsCtx,
            asteroidCtx,
            starsRef.current,
            shootingStarsRef.current,
            isDarkRef.current,
          );
        }
      }

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

    useEffect(() => {
      if (!paused && !animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }, [paused, animate]);

    return (
      <>
        <canvas
          ref={starsCanvasRef}
          className="pointer-events-none fixed inset-0 h-[100lvh] w-[100lvw] -z-10 opacity-0 motion-safe:animate-[fade-in_1500ms_cubic-bezier(0.215,0.61,0.355,1)_forwards] motion-reduce:opacity-100"
        />
        <canvas
          ref={asteroidCanvasRef}
          className="pointer-events-none fixed inset-0 z-[45] h-[100lvh] w-[100lvw] opacity-0 motion-safe:animate-[fade-in_1500ms_cubic-bezier(0.215,0.61,0.355,1)_forwards] motion-reduce:opacity-100"
        />
      </>
    );
  },
  () => true,
);
