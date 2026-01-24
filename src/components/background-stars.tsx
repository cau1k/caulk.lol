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

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  speed: number;
  life: number;
  maxLife: number;
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

const SHOOTING_STAR_CONFIG = {
  minInterval: 3000,
  maxInterval: 8000,
  minSpeed: 8,
  maxSpeed: 14,
  minLength: 80,
  maxLength: 160,
  fadeInDuration: 0.1,
  fadeOutStart: 0.6,
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

function createShootingStar(width: number, height: number): ShootingStar {
  const startX = Math.random() * width * 0.8;
  const startY = -20;

  const angle = (Math.PI / 4) + (Math.random() * Math.PI / 6);
  const speed =
    SHOOTING_STAR_CONFIG.minSpeed +
    Math.random() * (SHOOTING_STAR_CONFIG.maxSpeed - SHOOTING_STAR_CONFIG.minSpeed);

  const maxLife = (Math.max(width, height) * 1.5) / speed;

  return {
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length:
      SHOOTING_STAR_CONFIG.minLength +
      Math.random() * (SHOOTING_STAR_CONFIG.maxLength - SHOOTING_STAR_CONFIG.minLength),
    opacity: 0,
    speed,
    life: 0,
    maxLife,
  };
}

function drawShootingStar(
  ctx: CanvasRenderingContext2D,
  star: ShootingStar,
  isDark: boolean
): void {
  const progress = star.life / star.maxLife;

  let opacity = star.opacity;
  if (progress < SHOOTING_STAR_CONFIG.fadeInDuration) {
    opacity = progress / SHOOTING_STAR_CONFIG.fadeInDuration;
  } else if (progress > SHOOTING_STAR_CONFIG.fadeOutStart) {
    opacity = 1 - (progress - SHOOTING_STAR_CONFIG.fadeOutStart) / (1 - SHOOTING_STAR_CONFIG.fadeOutStart);
  } else {
    opacity = 1;
  }

  const tailX = star.x - (star.vx / star.speed) * star.length;
  const tailY = star.y - (star.vy / star.speed) * star.length;

  const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
  const baseColor = isDark ? "200, 210, 220" : "60, 70, 80";
  gradient.addColorStop(0, `rgba(${baseColor}, 0)`);
  gradient.addColorStop(0.7, `rgba(${baseColor}, ${opacity * 0.4})`);
  gradient.addColorStop(1, `rgba(${baseColor}, ${opacity * 0.8})`);

  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(star.x, star.y);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(star.x, star.y, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = isDark
    ? `rgba(255, 255, 255, ${opacity * 0.9})`
    : `rgba(40, 50, 60, ${opacity * 0.7})`;
  ctx.fill();
}

export const BackgroundStars = memo(
  function BackgroundStars() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const starsRef = useRef<Star[]>([]);
    const shootingStarsRef = useRef<ShootingStar[]>([]);
    const animationRef = useRef<number | null>(null);
    const isDarkRef = useRef<boolean>(true);
    const nextShootingStarRef = useRef<number>(0);

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

      if (time > nextShootingStarRef.current) {
        shootingStarsRef.current.push(
          createShootingStar(canvas.width, canvas.height)
        );
        nextShootingStarRef.current =
          time +
          SHOOTING_STAR_CONFIG.minInterval +
          Math.random() * (SHOOTING_STAR_CONFIG.maxInterval - SHOOTING_STAR_CONFIG.minInterval);
      }

      shootingStarsRef.current = shootingStarsRef.current.filter((star) => {
        star.x += star.vx;
        star.y += star.vy;
        star.life += 1;

        if (star.life > star.maxLife) return false;

        drawShootingStar(ctx, star, isDark);
        return true;
      });

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
      nextShootingStarRef.current = performance.now() + 1000 + Math.random() * 2000;
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
