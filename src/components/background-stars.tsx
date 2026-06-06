"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { useBackgroundStarsOptional } from "./background-stars-context";

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

type TrailPoint = {
  x: number;
  y: number;
  opacity: number;
};

type AsteroidPixel = {
  x: number;
  y: number;
  shade: AsteroidShade;
};

type AsteroidSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  shade: AsteroidShade;
};

type AsteroidSprite = {
  pixels: AsteroidPixel[];
  segments: AsteroidSegment[];
  rotation: number;
  scale: number;
  alpha: number;
};

type ShootingStar = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  distance: number;
  trail: TrailPoint[];
  asteroid: AsteroidSprite;
};

type StarColor = "muted" | "accent" | "primary";
type AsteroidShade = "light" | "mid" | "dark";

type CanvasSize = {
  width: number;
  height: number;
};

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

const SHOOTING_STAR_CONFIG = {
  minInterval: 3000,
  maxInterval: 8000,
  minSpeed: 2,
  maxSpeed: 4,
  pixelSize: 3,
  trailSpacing: 12,
  trailFadeRate: 0.025,
} as const;

const ASTEROID_VARIANTS: Array<{
  pixels: AsteroidPixel[];
  segments: AsteroidSegment[];
}> = [
  {
    pixels: [
      { x: 1, y: 0, shade: "light" },
      { x: 2, y: 0, shade: "mid" },
      { x: 0, y: 1, shade: "mid" },
      { x: 1, y: 1, shade: "dark" },
      { x: 2, y: 1, shade: "mid" },
    ],
    segments: [
      { x1: 3, y1: 0, x2: 4, y2: 1, shade: "light" },
      { x1: 0, y1: 1, x2: -1, y2: 2, shade: "dark" },
      { x1: 3, y1: 1, x2: 4, y2: 2, shade: "mid" },
    ],
  },
  {
    pixels: [
      { x: 1, y: 0, shade: "mid" },
      { x: 2, y: 0, shade: "light" },
      { x: 0, y: 1, shade: "dark" },
      { x: 1, y: 1, shade: "mid" },
      { x: 2, y: 1, shade: "mid" },
      { x: 1, y: 2, shade: "dark" },
    ],
    segments: [
      { x1: 3, y1: 0, x2: 4, y2: 1, shade: "mid" },
      { x1: 0, y1: 1, x2: -1, y2: 2, shade: "mid" },
    ],
  },
  {
    pixels: [
      { x: 1, y: 0, shade: "light" },
      { x: 2, y: 0, shade: "dark" },
      { x: 0, y: 1, shade: "mid" },
      { x: 1, y: 1, shade: "mid" },
      { x: 2, y: 1, shade: "light" },
      { x: 3, y: 1, shade: "dark" },
    ],
    segments: [
      { x1: 3, y1: 0, x2: 4, y2: 1, shade: "dark" },
      { x1: 0, y1: 1, x2: -1, y2: 2, shade: "light" },
      { x1: 4, y1: 1, x2: 5, y2: 2, shade: "mid" },
    ],
  },
  {
    pixels: [
      { x: 0, y: 0, shade: "dark" },
      { x: 1, y: 0, shade: "mid" },
      { x: 2, y: 0, shade: "light" },
      { x: 1, y: 1, shade: "mid" },
      { x: 2, y: 1, shade: "dark" },
      { x: 3, y: 1, shade: "mid" },
    ],
    segments: [
      { x1: 0, y1: 1, x2: -1, y2: 2, shade: "mid" },
      { x1: 3, y1: 0, x2: 4, y2: 1, shade: "dark" },
    ],
  },
  {
    pixels: [
      { x: 1, y: 0, shade: "dark" },
      { x: 0, y: 1, shade: "light" },
      { x: 1, y: 1, shade: "mid" },
      { x: 2, y: 1, shade: "mid" },
      { x: 0, y: 2, shade: "dark" },
      { x: 1, y: 2, shade: "mid" },
    ],
    segments: [
      { x1: 2, y1: 0, x2: 3, y2: 1, shade: "light" },
      { x1: 2, y1: 2, x2: 3, y2: 3, shade: "dark" },
    ],
  },
  {
    pixels: [
      { x: 2, y: 0, shade: "light" },
      { x: 0, y: 1, shade: "mid" },
      { x: 1, y: 1, shade: "dark" },
      { x: 2, y: 1, shade: "mid" },
      { x: 3, y: 1, shade: "light" },
      { x: 1, y: 2, shade: "mid" },
      { x: 2, y: 2, shade: "dark" },
    ],
    segments: [
      { x1: 4, y1: 1, x2: 5, y2: 2, shade: "mid" },
      { x1: 1, y1: 0, x2: 0, y2: 1, shade: "dark" },
    ],
  },
  {
    pixels: [
      { x: 0, y: 0, shade: "mid" },
      { x: 1, y: 0, shade: "light" },
      { x: 2, y: 0, shade: "mid" },
      { x: 0, y: 1, shade: "dark" },
      { x: 1, y: 1, shade: "mid" },
      { x: 2, y: 1, shade: "dark" },
      { x: 3, y: 1, shade: "mid" },
    ],
    segments: [
      { x1: 3, y1: 0, x2: 4, y2: 1, shade: "light" },
      { x1: 0, y1: 2, x2: 1, y2: 1, shade: "dark" },
    ],
  },
];

function getStarColor(color: StarColor, isDark: boolean): string {
  switch (color) {
    case "primary":
      return isDark ? "rgba(120, 220, 160, 0.9)" : "rgba(60, 140, 90, 0.7)";
    case "accent":
      return isDark ? "rgba(180, 200, 220, 0.7)" : "rgba(100, 120, 140, 0.5)";
    case "muted":
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

function createShootingStar(width: number): ShootingStar {
  const x = Math.random() * width * 0.8;
  const angle = 45 + Math.random() * 45;

  return {
    x,
    y: 0,
    angle,
    speed:
      SHOOTING_STAR_CONFIG.minSpeed +
      Math.random() *
        (SHOOTING_STAR_CONFIG.maxSpeed - SHOOTING_STAR_CONFIG.minSpeed),
    distance: 0,
    trail: [],
    asteroid: createAsteroidSprite(),
  };
}

function createAsteroidSprite(): AsteroidSprite {
  const variant =
    ASTEROID_VARIANTS[Math.floor(Math.random() * ASTEROID_VARIANTS.length)] ??
    ASTEROID_VARIANTS[0];

  return {
    pixels: variant.pixels,
    segments: variant.segments,
    rotation: (Math.random() - 0.5) * 0.7,
    scale: 0.82 + Math.random() * 0.38,
    alpha: 0.76 + Math.random() * 0.22,
  };
}

function updateShootingStar(star: ShootingStar): void {
  const radians = (star.angle * Math.PI) / 180;
  star.x += star.speed * Math.cos(radians);
  star.y += star.speed * Math.sin(radians);
  star.distance += star.speed;

  if (star.distance % SHOOTING_STAR_CONFIG.trailSpacing < star.speed) {
    star.trail.push({
      x: star.x,
      y: star.y,
      opacity: 1.0,
    });
  }

  for (const point of star.trail) {
    point.opacity -= SHOOTING_STAR_CONFIG.trailFadeRate;
  }
  star.trail = star.trail.filter((p) => p.opacity > 0);
}

function drawShootingStar(
  ctx: CanvasRenderingContext2D,
  star: ShootingStar,
  isDark: boolean,
): void {
  const px = SHOOTING_STAR_CONFIG.pixelSize;
  const radians = (star.angle * Math.PI) / 180;

  for (const point of star.trail) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(radians);
    ctx.translate(-point.x, -point.y);

    ctx.globalAlpha = point.opacity * (isDark ? 0.55 : 0.4);
    ctx.fillStyle = isDark ? "rgba(168, 145, 118, 1)" : "rgba(95, 82, 68, 1)";
    ctx.fillRect(point.x, point.y, px, px);

    ctx.restore();
  }

  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(radians + star.asteroid.rotation);
  ctx.translate(-star.x, -star.y);

  ctx.globalAlpha = star.asteroid.alpha * (isDark ? 0.95 : 0.82);
  drawAsteroid(ctx, star, isDark);

  ctx.restore();
}

function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  star: ShootingStar,
  isDark: boolean,
): void {
  const px = SHOOTING_STAR_CONFIG.pixelSize * star.asteroid.scale;
  const originX = star.x - px * 1.3;
  const originY = star.y - px;

  ctx.lineWidth = px;
  ctx.lineCap = "square";

  for (const segment of star.asteroid.segments) {
    ctx.strokeStyle = getAsteroidColor(segment.shade, isDark);
    ctx.beginPath();
    ctx.moveTo(originX + segment.x1 * px, originY + segment.y1 * px);
    ctx.lineTo(originX + segment.x2 * px, originY + segment.y2 * px);
    ctx.stroke();
  }

  for (const pixel of star.asteroid.pixels) {
    ctx.fillStyle = getAsteroidColor(pixel.shade, isDark);
    ctx.fillRect(originX + pixel.x * px, originY + pixel.y * px, px, px);
  }
}

function getAsteroidColor(shade: AsteroidShade, isDark: boolean): string {
  if (isDark) {
    switch (shade) {
      case "light":
        return "#d6c7a9";
      case "dark":
        return "#74685c";
      case "mid":
        return "#a8967e";
    }
  }

  switch (shade) {
    case "light":
      return "#8a7b68";
    case "dark":
      return "#3f3a34";
    case "mid":
      return "#665b4d";
  }
}

function drawStaticFrame(
  starsCtx: CanvasRenderingContext2D,
  asteroidCtx: CanvasRenderingContext2D,
  stars: Star[],
  shootingStars: ShootingStar[],
  isDark: boolean,
): void {
  for (const star of stars) {
    starsCtx.beginPath();
    starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    starsCtx.fillStyle = getStarColor(star.color, isDark);
    starsCtx.globalAlpha = star.opacity;
    starsCtx.fill();
  }

  starsCtx.globalAlpha = 1;

  for (const star of shootingStars) {
    drawShootingStar(asteroidCtx, star, isDark);
  }
}

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
    const canvasSizeRef = useRef<CanvasSize>({ width: 0, height: 0 });

    useEffect(() => {
      pausedRef.current = paused;

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

      const area = canvas.width * canvas.height;
      const count = Math.floor(area * STAR_CONFIG.density);
      starsRef.current = Array.from({ length: count }, () =>
        createStar(canvas.width, canvas.height),
      );
    }, []);

    const updateTheme = useCallback(() => {
      isDarkRef.current = document.documentElement.classList.contains("dark");

      if (pausedRef.current) {
        const starsCanvas = starsCanvasRef.current;
        const asteroidCanvas = asteroidCanvasRef.current;
        const starsCtx = starsCanvas?.getContext("2d");
        const asteroidCtx = asteroidCanvas?.getContext("2d");
        if (starsCanvas && asteroidCanvas && starsCtx && asteroidCtx) {
          starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
          asteroidCtx.clearRect(
            0,
            0,
            asteroidCanvas.width,
            asteroidCanvas.height,
          );
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

      starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
      asteroidCtx.clearRect(0, 0, asteroidCanvas.width, asteroidCanvas.height);

      const isDark = isDarkRef.current;
      const timeSeconds = time / 1000;

      for (const star of starsRef.current) {
        if (Math.random() < STAR_CONFIG.twinkleChance / 60) {
          const twinkle = Math.sin(
            timeSeconds * star.twinkleSpeed + star.twinklePhase,
          );
          star.opacity = star.baseOpacity * (0.6 + 0.4 * twinkle);
        }

        starsCtx.beginPath();
        starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        starsCtx.fillStyle = getStarColor(star.color, isDark);
        starsCtx.globalAlpha = star.opacity;
        starsCtx.fill();
      }

      starsCtx.globalAlpha = 1;

      if (time > nextShootingStarRef.current) {
        shootingStarsRef.current.push(createShootingStar(starsCanvas.width));
        nextShootingStarRef.current =
          time +
          SHOOTING_STAR_CONFIG.minInterval +
          Math.random() *
            (SHOOTING_STAR_CONFIG.maxInterval -
              SHOOTING_STAR_CONFIG.minInterval);
      }

      shootingStarsRef.current = shootingStarsRef.current.filter((star) => {
        updateShootingStar(star);

        const outOfBounds =
          star.x < -50 ||
          star.x > starsCanvas.width + 50 ||
          star.y < -50 ||
          star.y > starsCanvas.height + 50;

        if (outOfBounds && star.trail.length === 0) return false;

        drawShootingStar(asteroidCtx, star, isDark);
        return true;
      });

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
            asteroidCtx.clearRect(
              0,
              0,
              asteroidCanvas.width,
              asteroidCanvas.height,
            );
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
      nextShootingStarRef.current =
        performance.now() + 1000 + Math.random() * 2000;

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
