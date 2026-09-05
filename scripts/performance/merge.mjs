#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { compare, markdown, summarize } from "./report.mjs";

const infraErrorPattern = /ERR_NETWORK_CHANGED|chrome-error:\/\/chromewebdata/i;

const args = parseArgs(process.argv.slice(2));
const baseline = await readJson(args.baseline);
const base = await readJson(args.candidate);
const repair = await readJson(args.repair);

assertSameRunShape(base, repair);
assertSameRunShape(base, baseline, { allowRevisionDiff: true });
if (!(Date.parse(repair.startedAt) >= Date.parse(base.finishedAt)) || !repair.finishedAt) {
  throw new Error("Repair must be a completed run performed after the interrupted run.");
}

base.summary = summarize(base.samples ?? []);
repair.summary = summarize(repair.samples ?? []);
baseline.summary = summarize(baseline.samples ?? []);

const affectedPaths = findAffectedPaths(base.samples ?? []);
if (!affectedPaths.size) throw new Error("No infrastructure-error pages found in candidate.");
assertOnlyAffectedErrors(base.samples ?? [], affectedPaths);

const repairedSamples = repairSamples(repair.samples ?? [], affectedPaths);
const keptSamples = (base.samples ?? []).filter((sample) => !affectedPaths.has(sample.path));
const samples = [...keptSamples, ...repairedSamples].sort(sampleSort);
const output = {
  ...base,
  label: basename(args.output),
  finishedAt: repair.finishedAt,
  samples,
  summary: summarize(samples),
  comparison: undefined,
  provenance: {
    ...base.provenance,
    merge: {
      base: args.candidate,
      repair: args.repair,
      repairStartedAt: repair.startedAt,
      repairFinishedAt: repair.finishedAt,
      criterion:
        "whole-page replacement only for ERR_NETWORK_CHANGED/chrome-error infrastructure failures",
      replacedPaths: [...affectedPaths].sort(),
      replacedSamples: repairedSamples.length,
      keptSamples: keptSamples.length,
    },
  },
};
output.comparison = compare(baseline, output);
assertComplete(output);

await writeFile(`${args.output}.json`, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(`${args.output}.md`, markdown(output));
console.log(`merged ${affectedPaths.size} page(s), ${repairedSamples.length} replacement samples`);
console.log(`wrote ${args.output}.json`);
console.log(`wrote ${args.output}.md`);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag?.startsWith("--") || !value) usage();
    result[flag.slice(2)] = value;
  }
  if (!result.baseline || !result.candidate || !result.repair || !result.output) usage();
  return result;
}

function usage() {
  throw new Error(
    "Usage: node scripts/performance/merge.mjs --baseline baseline.json --candidate base.json --repair repair.json --output test-results/performance/final",
  );
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function assertSameRunShape(a, b, opts = {}) {
  for (const key of ["harnessHash", "browser", "runs"]) {
    if (a[key] !== b[key]) throw new Error(`${key} differs: ${a[key]} !== ${b[key]}`);
  }
  if (!opts.allowRevisionDiff && a.revision !== b.revision) {
    throw new Error(`revision differs: ${a.revision} !== ${b.revision}`);
  }
  if (JSON.stringify(a.profile) !== JSON.stringify(b.profile)) throw new Error("profile differs");
  if (JSON.stringify(a.targets) !== JSON.stringify(b.targets)) throw new Error("origins differ");
}

function findAffectedPaths(samples) {
  return new Set(samples.filter(isInfraError).map((sample) => sample.path));
}

function assertOnlyAffectedErrors(samples, affectedPaths) {
  const bad = samples.filter((sample) => hasError(sample) && !isInfraError(sample));
  if (bad.length)
    throw new Error(`Non-infrastructure candidate errors: ${bad.map(sampleId).join(", ")}`);
  for (const path of affectedPaths) {
    if (!samples.some((sample) => sample.path === path && isInfraError(sample))) {
      throw new Error(`Affected path lacks infra error: ${path}`);
    }
  }
}

function repairSamples(samples, affectedPaths) {
  if (samples.some((sample) => !affectedPaths.has(sample.path))) {
    throw new Error("Repair contains pages without infrastructure errors in the base run.");
  }
  const wanted = new Set(
    [...affectedPaths].flatMap((path) =>
      ["local", "live"].flatMap((target) =>
        ["cold", "warm"].map((cache) => `${target}|${path}|${cache}`),
      ),
    ),
  );
  const selected = samples.filter((sample) => affectedPaths.has(sample.path));
  const groups = Map.groupBy(
    selected,
    (sample) => `${sample.target}|${sample.path}|${sample.cache}`,
  );
  const badKeys = [...groups.keys()].filter((key) => !wanted.has(key));
  if (badKeys.length)
    throw new Error(`Repair contains unexpected affected keys: ${badKeys.join(", ")}`);
  for (const key of wanted) {
    const group = groups.get(key) ?? [];
    if (group.length !== 3)
      throw new Error(`Repair needs exactly 3 samples for ${key}; got ${group.length}`);
    if ([...new Set(group.map((sample) => sample.run))].sort().join(",") !== "1,2,3") {
      throw new Error(`Repair must contain runs 1, 2, and 3 exactly once for ${key}`);
    }
    const errors = group.filter(hasError);
    if (errors.length)
      throw new Error(`Repair has errors for ${key}: ${errors.map(errorText).join("; ")}`);
  }
  return selected;
}

function assertComplete(report) {
  if ((report.samples ?? []).length !== 240)
    throw new Error(`Expected 240 samples, got ${report.samples?.length ?? 0}`);
  if (
    new Set(
      report.samples.map(
        (sample) => `${sample.run}|${sample.target}|${sample.path}|${sample.cache}`,
      ),
    ).size !== 240
  ) {
    throw new Error("Duplicate sample keys in merged run");
  }
  if ((report.summary ?? []).length !== 80)
    throw new Error(`Expected 80 cells, got ${report.summary?.length ?? 0}`);
  for (const row of report.summary) {
    if (row.count !== 3)
      throw new Error(
        `Expected 3 samples for ${row.target}|${row.path}|${row.cache}; got ${row.count}`,
      );
    if (row.failures)
      throw new Error(
        `Merged output still has failures for ${row.target}|${row.path}|${row.cache}`,
      );
  }
}

function hasError(sample) {
  return Boolean(sample.error || sample.failedRequests?.length);
}

function isInfraError(sample) {
  return infraErrorPattern.test(errorText(sample));
}

function errorText(sample) {
  return [
    sample.error,
    ...(sample.failedRequests ?? []).map((request) => request.error || request.url),
  ]
    .filter(Boolean)
    .join(" ");
}

function sampleId(sample) {
  return `${sample.run}|${sample.target}|${sample.path}|${sample.cache}: ${errorText(sample)}`;
}

function sampleSort(a, b) {
  return `${a.run}|${a.target}|${a.path}|${a.cache}`.localeCompare(
    `${b.run}|${b.target}|${b.path}|${b.cache}`,
  );
}
