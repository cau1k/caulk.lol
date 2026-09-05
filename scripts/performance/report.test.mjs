import assert from "node:assert/strict";
import test from "node:test";
import { compare, summarize } from "./report.mjs";

test("reports arithmetic means and retains failures in each page/cache cell", () => {
  const summary = summarize([
    { target: "live", path: "/", cache: "cold", loadMs: 100 },
    { target: "live", path: "/", cache: "cold", loadMs: 500 },
    { target: "live", path: "/", cache: "cold", error: "timeout" },
    { target: "live", path: "/", cache: "warm", loadMs: 10 },
  ]);
  assert.equal(summary[0].loadMs.mean, 300);
  assert.equal(summary[0].failures, 1);
  assert.equal(summary[0].count, 3);
  assert.equal(summary[1].loadMs.mean, 10);
});

test("cannot pass by omitting a page, losing interactivity, or reducing samples", () => {
  const row = {
    target: "live",
    path: "/",
    cache: "cold",
    count: 5,
    failures: 0,
    loadMs: { mean: 900 },
    readyMs: { mean: 900 },
  };
  const baseline = { profile: {}, browser: "fixed", summary: [row] };
  const current = (change) => ({
    ...baseline,
    summary: [{ ...row, loadMs: { mean: 200 }, readyMs: { mean: 200 }, ...change }],
  });
  assert.equal(compare(baseline, current({}))[0].passed, true);
  assert.equal(compare(baseline, { ...baseline, summary: [] })[0].passed, false);
  assert.equal(compare(baseline, current({ readyMs: { mean: 500 } }))[0].passed, false);
  assert.equal(compare(baseline, current({ count: 1 }))[0].passed, false);
  assert.equal(compare(baseline, current({ failures: 1 }))[0].passed, false);
  assert.throws(
    () => compare(baseline, { ...baseline, profile: { cpuRate: 1 } }),
    /profiles differ/,
  );
});
