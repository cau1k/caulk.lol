export type Star = {
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

export type ShootingStarColors = { core: string; glow: string };

export type ShootingStar = {
  /** Position in document CSS pixels; scrolling never changes the simulation. */
  x: number;
  y: number;
  angle: number;
  /** CSS pixels per second, independent of the display's refresh rate. */
  speed: number;
  distance: number;
  trail: TrailPoint[];
};

type StarColor = "muted" | "accent" | "primary";

export type CanvasSize = {
  width: number;
  height: number;
};

export type ShootingStarFrame = {
  elapsedMs: number;
  scrollX: number;
  scrollY: number;
  /** The whole page, not the canvas viewport. */
  bounds: CanvasSize;
};

export const STAR_CONFIG = {
  density: 0.00008,
  minSize: 1,
  maxSize: 2.5,
  minOpacity: 0.15,
  maxOpacity: 0.6,
  twinkleChance: 0.4,
  primaryChance: 0.03,
  accentChance: 0.08,
} as const;

export const SHOOTING_STAR_CONFIG = {
  maxActive: 3,
  minInterval: 3000,
  maxInterval: 8000,
  minSpeed: 120,
  maxSpeed: 240,
  trailSpacing: 12,
  trailFadeRate: 1.5,
} as const;

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

export function createStar(width: number, height: number): Star {
  const rand = Math.random();
  let color: StarColor = "muted";
  if (rand < STAR_CONFIG.primaryChance) {
    color = "primary";
  } else if (rand < STAR_CONFIG.primaryChance + STAR_CONFIG.accentChance) {
    color = "accent";
  }

  const baseOpacity =
    STAR_CONFIG.minOpacity + Math.random() * (STAR_CONFIG.maxOpacity - STAR_CONFIG.minOpacity);

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: STAR_CONFIG.minSize + Math.random() * (STAR_CONFIG.maxSize - STAR_CONFIG.minSize),
    opacity: baseOpacity,
    baseOpacity,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.3 + Math.random() * 0.7,
    color,
  };
}

export function createShootingStar(width: number, pageY: number): ShootingStar {
  const x = Math.random() * width * 0.8;
  const angle = 45 + Math.random() * 45;

  return {
    x,
    y: pageY,
    angle,
    speed:
      SHOOTING_STAR_CONFIG.minSpeed +
      Math.random() * (SHOOTING_STAR_CONFIG.maxSpeed - SHOOTING_STAR_CONFIG.minSpeed),
    distance: 0,
    trail: [],
  };
}

function updateShootingStar(star: ShootingStar, frame: ShootingStarFrame): void {
  const seconds = frame.elapsedMs / 1000;
  const previousDistance = star.distance;
  const radians = (star.angle * Math.PI) / 180;
  star.x += star.speed * seconds * Math.cos(radians);
  star.y += star.speed * seconds * Math.sin(radians);
  star.distance += star.speed * seconds;

  for (const point of star.trail) {
    point.opacity -= SHOOTING_STAR_CONFIG.trailFadeRate * seconds;
  }
  star.trail = star.trail.filter((p) => p.opacity > 0);

  // Sample by distance, preserving the same trail lifetime at any frame rate.
  // After a long frame, generate only points that have not already faded away.
  const start = Math.max(
    previousDistance,
    star.distance - star.speed / SHOOTING_STAR_CONFIG.trailFadeRate,
  );
  for (
    let distance =
      (Math.floor(start / SHOOTING_STAR_CONFIG.trailSpacing) + 1) *
      SHOOTING_STAR_CONFIG.trailSpacing;
    distance <= star.distance;
    distance += SHOOTING_STAR_CONFIG.trailSpacing
  ) {
    const behind = star.distance - distance;
    const point = {
      x: star.x - behind * Math.cos(radians),
      y: star.y - behind * Math.sin(radians),
      opacity: 1 - (behind / star.speed) * SHOOTING_STAR_CONFIG.trailFadeRate,
    };
    if (!isShootingStarOutOfBounds(point, frame.bounds)) star.trail.push(point);
  }
}

function isShootingStarOutOfBounds(star: { x: number; y: number }, bounds: CanvasSize) {
  return star.x < -50 || star.x > bounds.width + 50 || star.y < -50 || star.y > bounds.height + 50;
}

function drawShootingStar(
  ctx: CanvasRenderingContext2D,
  star: ShootingStar,
  isDark: boolean,
  colors: ShootingStarColors,
): void {
  const radians = (star.angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const tailLength = Math.min(star.distance, star.speed / SHOOTING_STAR_CONFIG.trailFadeRate);
  const tailX = star.x - tailLength * dx;
  const tailY = star.y - tailLength * dy;
  const palette = getMeteorPalette(isDark, colors);
  const trail = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
  trail.addColorStop(0, palette.transparent);
  trail.addColorStop(0.58, palette.wake);
  trail.addColorStop(0.88, palette.core);
  trail.addColorStop(1, palette.head);

  // Keep the glow local and translucent. Normal source-over blending avoids
  // additive flashes when paths overlap; no full-canvas blur is needed.
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = trail;
  ctx.globalAlpha = isDark ? 0.17 : 0.16;
  ctx.lineWidth = isDark ? 14 : 13;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(star.x, star.y);
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(tailX + tailLength * 0.18 * dx, tailY + tailLength * 0.18 * dy);
  ctx.lineTo(star.x, star.y);
  ctx.stroke();

  ctx.globalAlpha = isDark ? 0.38 : 0.4;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(tailX + tailLength * 0.48 * dx, tailY + tailLength * 0.48 * dy);
  ctx.lineTo(star.x, star.y);
  ctx.stroke();

  const halo = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, isDark ? 22 : 18);
  halo.addColorStop(0, palette.halo);
  halo.addColorStop(0.45, palette.aura);
  halo.addColorStop(1, palette.transparent);
  ctx.fillStyle = halo;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(star.x, star.y, isDark ? 22 : 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.head;
  ctx.globalAlpha = isDark ? 0.62 : 0.68;
  ctx.beginPath();
  ctx.arc(star.x, star.y, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getMeteorPalette(isDark: boolean, colors: ShootingStarColors) {
  // Canvas accepts resolved CSS colors, including the theme's OKLCH values.
  const light = `color-mix(in oklab, ${colors.core} 70%, ${colors.glow})`;
  return {
    transparent: "transparent",
    wake: `color-mix(in srgb, ${colors.glow} ${isDark ? 8 : 6}%, transparent)`,
    core: `color-mix(in srgb, ${light} 20%, transparent)`,
    head: `color-mix(in srgb, ${light} ${isDark ? 38 : 48}%, transparent)`,
    halo: `color-mix(in srgb, ${colors.glow} 3.5%, transparent)`,
    aura: `color-mix(in srgb, ${colors.glow} 1.2%, transparent)`,
  };
}

export function drawStaticFrame(
  starsCtx: CanvasRenderingContext2D,
  asteroidCtx: CanvasRenderingContext2D,
  stars: Star[],
  shootingStars: ShootingStar[],
  isDark: boolean,
  scroll: { x: number; y: number },
  colors: ShootingStarColors,
): void {
  drawStars(starsCtx, stars, isDark);

  asteroidCtx.save();
  asteroidCtx.translate(-scroll.x, -scroll.y);
  for (const star of shootingStars) {
    drawShootingStar(asteroidCtx, star, isDark, colors);
  }
  asteroidCtx.restore();
}

function drawStars(starsCtx: CanvasRenderingContext2D, stars: Star[], isDark: boolean): void {
  for (const star of stars) {
    starsCtx.beginPath();
    starsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    starsCtx.fillStyle = getStarColor(star.color, isDark);
    starsCtx.globalAlpha = star.opacity;
    starsCtx.fill();
  }

  starsCtx.globalAlpha = 1;
}

/** Keep random draws and twinkle timing unchanged, retaining pixels until they change. */
export function renderStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  time: number,
  isDark: boolean,
  forceRedraw: boolean,
): void {
  let changed = forceRedraw;
  for (const star of stars) {
    if (Math.random() < STAR_CONFIG.twinkleChance / 60) {
      const twinkle = Math.sin((time / 1000) * star.twinkleSpeed + star.twinklePhase);
      const opacity = star.baseOpacity * (0.6 + 0.4 * twinkle);
      if (opacity !== star.opacity) changed = true;
      star.opacity = opacity;
    }
  }
  if (!changed) return;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawStars(ctx, stars, isDark);
}

/** Advance in document space even offscreen, then project onto a viewport-sized canvas. */
export function renderShootingStars(
  ctx: CanvasRenderingContext2D,
  stars: ShootingStar[],
  isDark: boolean,
  frame: ShootingStarFrame,
  colors: ShootingStarColors,
): ShootingStar[] {
  // Check before advancing: the final disappearing trail still needs one clear.
  if (stars.length === 0) return stars;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const remaining = stars.filter((star) => {
    updateShootingStar(star, frame);
    return !isShootingStarOutOfBounds(star, frame.bounds) || star.trail.length > 0;
  });
  if (remaining.length === 0) return remaining;
  ctx.save();
  ctx.translate(-frame.scrollX, -frame.scrollY);
  for (const star of remaining) drawShootingStar(ctx, star, isDark, colors);
  ctx.restore();
  return remaining;
}
