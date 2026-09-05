import assert from "node:assert/strict";
import test from "node:test";
import { renderShootingStars, renderStars } from "../src/lib/stars.ts";

function canvas() {
  const commands = [];
  return {
    commands,
    canvas: { width: 100, height: 100 },
    beginPath() {},
    arc(...args) {
      commands.push(["arc", ...args]);
    },
    fill() {
      commands.push(["fill", this.fillStyle, this.globalAlpha]);
    },
    clearRect(...args) {
      commands.push(["clear", ...args]);
    },
    fillRect(...args) {
      commands.push(["rectangle", ...args]);
    },
    save() {},
    restore() {},
    translate(...args) { commands.push(["translate", ...args]); },
    rotate() {},
  };
}

const frame = (elapsedMs = 1000 / 60, scrollY = 0, height = 100) => ({
  elapsedMs,
  scrollX: 0,
  scrollY,
  bounds: { width: 100, height },
});

function star() {
  return {
    x: 10,
    y: 20,
    size: 2,
    opacity: 0.6,
    baseOpacity: 1,
    twinklePhase: 0,
    twinkleSpeed: 1,
    color: "muted",
  };
}

test("unchanged frames preserve the bitmap while consuming each star's normal random draw", (t) => {
  const random = t.mock.method(Math, "random", () => 0.9);
  const ctx = canvas();
  const stars = [star(), { ...star(), x: 40 }];
  renderStars(ctx, stars, 0, true, true);
  const initialBitmap = structuredClone(ctx.commands);
  renderStars(ctx, stars, 100, true, false);
  assert.deepEqual(ctx.commands, initialBitmap);
  assert.equal(random.mock.callCount(), 4);
  assert.equal(initialBitmap.filter(([command]) => command === "arc").length, 2);
});

test("a real twinkle repaints all stars once with the original opacity formula", (t) => {
  const values = [0, 0.9];
  t.mock.method(Math, "random", () => values.shift());
  const ctx = canvas();
  const stars = [star(), { ...star(), x: 40 }];
  renderStars(ctx, stars, 1000, true, false);
  assert.equal(stars[0].opacity, 0.6 + 0.4 * Math.sin(1));
  assert.equal(stars[1].opacity, 0.6);
  assert.equal(ctx.commands.filter(([command]) => command === "clear").length, 1);
  assert.equal(ctx.commands.filter(([command]) => command === "arc").length, 2);
  assert.equal(values.length, 0);
});

test("a selected twinkle with identical opacity leaves existing pixels untouched", (t) => {
  t.mock.method(Math, "random", () => 0);
  const ctx = canvas();
  renderStars(ctx, [star()], 0, true, false);
  assert.deepEqual(ctx.commands, []);
});

test("an invalidated frame repaints completely even without a twinkle", (t) => {
  t.mock.method(Math, "random", () => 0.9);
  const ctx = canvas();
  renderStars(ctx, [star()], 0, false, true);
  assert.deepEqual(ctx.commands[0], ["clear", 0, 0, 100, 100]);
  assert.deepEqual(ctx.commands.at(-1), ["fill", "rgba(80, 80, 90, 0.25)", 0.6]);
  assert.equal(ctx.globalAlpha, 1);
});

test("an empty asteroid layer is untouched, including after its last trail disappears", () => {
  const ctx = canvas();
  assert.deepEqual(renderShootingStars(ctx, [], true, frame()), []);
  assert.deepEqual(ctx.commands, []);
  const shootingStar = {
    x: 200,
    y: 0,
    angle: 45,
    speed: 180,
    distance: 0,
    trail: [{ x: 20, y: 20, opacity: 0.01 }],
    asteroid: { pixels: [], segments: [], rotation: 0, scale: 1, alpha: 0.5 },
  };
  const remaining = renderShootingStars(ctx, [shootingStar], true, frame());
  assert.deepEqual(remaining, []);
  assert.deepEqual(ctx.commands, [["clear", 0, 0, 100, 100]]);
  renderShootingStars(ctx, remaining, true, frame());
  assert.deepEqual(ctx.commands, [["clear", 0, 0, 100, 100]]);
});

test("active asteroids still move and paint on every frame with unchanged speed and trail decay", () => {
  const ctx = canvas();
  const shootingStar = {
    x: 10,
    y: 20,
    angle: 45,
    speed: 180,
    distance: 0,
    trail: [{ x: 5, y: 10, opacity: 1 }],
    asteroid: {
      pixels: [{ x: 0, y: 0, shade: "light" }],
      segments: [],
      rotation: 0,
      scale: 1,
      alpha: 0.5,
    },
  };
  const remaining = renderShootingStars(ctx, [shootingStar], true, frame());
  assert.equal(remaining[0], shootingStar);
  assert.equal(shootingStar.x, 10 + 3 * Math.cos(Math.PI / 4));
  assert.equal(shootingStar.y, 20 + 3 * Math.sin(Math.PI / 4));
  assert.equal(shootingStar.distance, 3);
  assert.equal(shootingStar.trail[0].opacity, 0.975);
  assert.equal(ctx.commands.filter(([command]) => command === "clear").length, 1);
  assert.equal(ctx.commands.filter(([command]) => command === "rectangle").length, 2);
});

function meteor() {
  return {
    x: 40, y: 90, angle: 90, speed: 180, distance: 0, trail: [],
    asteroid: { pixels: [], segments: [], rotation: 0, scale: 1, alpha: 0.5 },
  };
}

test("shooting stars keep moving outside the viewport and later reach the scrolled view", () => {
  const ctx = canvas();
  const star = meteor();
  let stars = renderShootingStars(ctx, [star], true, frame(1000, 0, 4000));
  assert.equal(stars.length, 1, "leaving the 100px viewport must not retire a star");
  assert.equal(star.y, 270);
  stars = renderShootingStars(ctx, stars, true, frame(1000, 600, 4000));
  assert.equal(stars.length, 1, "a star above the new viewport still advances");
  assert.equal(star.y, 450);
  ctx.commands.length = 0;
  stars = renderShootingStars(ctx, stars, true, frame(1000, 600, 4000));
  assert.equal(stars.length, 1);
  assert.equal(star.y - 600, 30, "the same star enters the new viewport on its own trajectory");
  assert.deepEqual(ctx.commands[1], ["translate", -0, -600]);
});

test("scrolling only changes projection, including a paused frame", () => {
  const ctx = canvas();
  const star = meteor();
  const before = structuredClone(star);
  renderShootingStars(ctx, [star], true, frame(0, 600, 4000));
  assert.deepEqual(star, before, "scrolling cannot move or age a shooting star");
  assert.deepEqual(ctx.commands[1], ["translate", -0, -600]);
});

test("travel and trail lifetime depend on elapsed time rather than display refresh rate", () => {
  const advance = (frames) => {
    const ctx = canvas();
    const star = meteor();
    for (let i = 0; i < frames; i++) {
      renderShootingStars(ctx, [star], true, frame(4000 / frames, 0, 4000));
    }
    return star;
  };
  const low = advance(240);
  const high = advance(480);
  const skipped = advance(1);
  [low, high, skipped].forEach((star) => {
    assert.ok(Math.abs(star.y - 810) < 0.00001);
    assert.ok(star.trail.length <= 11, "a long frame cannot accumulate an unbounded trail");
    assert.ok(star.trail.every((point) => point.opacity > 0 && point.opacity <= 1));
  });
});
