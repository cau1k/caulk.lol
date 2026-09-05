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
    translate() {},
    rotate() {},
  };
}

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
  assert.deepEqual(renderShootingStars(ctx, [], true), []);
  assert.deepEqual(ctx.commands, []);
  const shootingStar = {
    x: 200,
    y: 0,
    angle: 45,
    speed: 3,
    distance: 0,
    trail: [{ x: 20, y: 20, opacity: 0.01 }],
    asteroid: { pixels: [], segments: [], rotation: 0, scale: 1, alpha: 0.5 },
  };
  const remaining = renderShootingStars(ctx, [shootingStar], true);
  assert.deepEqual(remaining, []);
  assert.deepEqual(ctx.commands, [["clear", 0, 0, 100, 100]]);
  renderShootingStars(ctx, remaining, true);
  assert.deepEqual(ctx.commands, [["clear", 0, 0, 100, 100]]);
});

test("active asteroids still move and paint on every frame with unchanged speed and trail decay", () => {
  const ctx = canvas();
  const shootingStar = {
    x: 10,
    y: 20,
    angle: 45,
    speed: 3,
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
  const remaining = renderShootingStars(ctx, [shootingStar], true);
  assert.equal(remaining[0], shootingStar);
  assert.equal(shootingStar.x, 10 + 3 * Math.cos(Math.PI / 4));
  assert.equal(shootingStar.y, 20 + 3 * Math.sin(Math.PI / 4));
  assert.equal(shootingStar.distance, 3);
  assert.equal(shootingStar.trail[0].opacity, 0.975);
  assert.equal(ctx.commands.filter(([command]) => command === "clear").length, 1);
  assert.equal(ctx.commands.filter(([command]) => command === "rectangle").length, 2);
});
