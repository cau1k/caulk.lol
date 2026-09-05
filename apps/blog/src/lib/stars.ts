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

export type ShootingStar = {
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

export type CanvasSize = {
  width: number;
  height: number;
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

export function createShootingStar(width: number): ShootingStar {
  const x = Math.random() * width * 0.8;
  const angle = 45 + Math.random() * 45;

  return {
    x,
    y: 0,
    angle,
    speed:
      SHOOTING_STAR_CONFIG.minSpeed +
      Math.random() * (SHOOTING_STAR_CONFIG.maxSpeed - SHOOTING_STAR_CONFIG.minSpeed),
    distance: 0,
    trail: [],
    asteroid: createAsteroidSprite(),
  };
}

function createAsteroidSprite(): AsteroidSprite {
  const variant =
    ASTEROID_VARIANTS[Math.floor(Math.random() * ASTEROID_VARIANTS.length)] ?? ASTEROID_VARIANTS[0];

  return {
    pixels: variant.pixels,
    segments: variant.segments,
    rotation: (Math.random() - 0.5) * 0.7,
    scale: 0.82 + Math.random() * 0.38,
    alpha: 0.48 + Math.random() * 0.18,
  };
}

function updateShootingStar(star: ShootingStar, bounds: CanvasSize): void {
  const radians = (star.angle * Math.PI) / 180;
  star.x += star.speed * Math.cos(radians);
  star.y += star.speed * Math.sin(radians);
  star.distance += star.speed;

  if (
    !isShootingStarOutOfBounds(star, bounds) &&
    star.distance % SHOOTING_STAR_CONFIG.trailSpacing < star.speed
  ) {
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

function isShootingStarOutOfBounds(star: ShootingStar, bounds: CanvasSize) {
  return star.x < -50 || star.x > bounds.width + 50 || star.y < -50 || star.y > bounds.height + 50;
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

    ctx.globalAlpha = point.opacity * (isDark ? 0.34 : 0.26);
    ctx.fillStyle = isDark ? "rgba(168, 145, 118, 1)" : "rgba(95, 82, 68, 1)";
    ctx.fillRect(point.x, point.y, px, px);

    ctx.restore();
  }

  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(radians + star.asteroid.rotation);
  ctx.translate(-star.x, -star.y);

  ctx.globalAlpha = star.asteroid.alpha * (isDark ? 0.78 : 0.64);
  drawAsteroid(ctx, star, isDark);

  ctx.restore();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, star: ShootingStar, isDark: boolean): void {
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

export function drawStaticFrame(
  starsCtx: CanvasRenderingContext2D,
  asteroidCtx: CanvasRenderingContext2D,
  stars: Star[],
  shootingStars: ShootingStar[],
  isDark: boolean,
): void {
  drawStars(starsCtx, stars, isDark);

  for (const star of shootingStars) {
    drawShootingStar(asteroidCtx, star, isDark);
  }
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

/** Advance and paint existing asteroids; creation remains on the original clock. */
export function renderShootingStars(
  ctx: CanvasRenderingContext2D,
  stars: ShootingStar[],
  isDark: boolean,
): ShootingStar[] {
  // Check before advancing: the final disappearing trail still needs one clear.
  if (stars.length === 0) return stars;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  return stars.filter((star) => {
    updateShootingStar(star, ctx.canvas);
    if (isShootingStarOutOfBounds(star, ctx.canvas) && star.trail.length === 0) {
      return false;
    }
    drawShootingStar(ctx, star, isDark);
    return true;
  });
}
