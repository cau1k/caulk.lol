## Result

The site does less work and loads faster in most measured cases. The original
3× target was **not achieved**. Zero accepted closing this pass with the misses
documented; the benchmark threshold has not been lowered.

These are arithmetic means across all 20 pages, with equal page weight. The
speedup column divides the aggregate baseline load mean by the candidate mean;
the later overview also reports the distinct arithmetic mean of per-page ratios.

| Scope               | Mean load before → after | Load speedup | Mean readiness before → after |
| ------------------- | -----------------------: | -----------: | ----------------------------: |
| Local, cold browser |         629.0 → 441.3 ms |        1.43× |              931.1 → 663.5 ms |
| Local, warm browser |         339.8 → 108.2 ms |        3.14× |              483.4 → 202.9 ms |
| Live, cold browser  |         802.3 → 604.3 ms |        1.33× |            1206.7 → 1014.5 ms |
| Live, warm browser  |         292.2 → 233.3 ms |        1.25× |              441.0 → 355.2 ms |

Fifteen of 80 combinations reached 3× mean load speed, all local/warm. None
reached 3× mean readiness, so **all 80 miss the combined gate**. Readiness
improved in every cell. One load regression remains: live/warm
`/posts/prompt-caching-sucks`, approximately 1.2% slower. Three samples per cell,
live network variance, and simultaneous content edits do not establish its cause.

The homepage's local warm mean load fell from 350.9 to 94.9 ms; readiness fell
from 473.2 to 170.0 ms. Live cold homepage transfer fell from approximately
434.5 KB to 232.7 KB, while load improved from 730.8 to 638.5 ms. Less transfer
does not guarantee a proportional timing improvement.

## Changes shipped

- **Serve generated HTML.** Published pages read exact prerender artifacts from
  the Worker asset binding. The Worker retains telemetry; missing artifacts fail
  visibly. Hashed assets use a year of immutable caching, HTML a short freshness
  window, and unhashed fonts a separate policy.
- **Finish the shared header.** The public header now belongs to the root layout,
  so its navigation and theme controls can initialize independently of lazy page
  content. Desktop/mobile controls, hotkeys, focus, and browser history remain.
- **Finish image loading.** Article images retain the Fumadocs image component and
  use native lazy loading, with an explicit eager override available. Scrolling
  and image decoding are tested separately from the load event.
- **Preload actual dependencies.** A pinned TanStack Start manifest patch walks
  transitive static imports with cycle protection. A build plugin maps each MDX
  article to its emitted entry and static imports. Dynamic optional widgets stay
  separate. Tests exercise the installed manifest builder and plugin lifecycle.
- **Keep expensive authoring work out of the reader's browser.** Excalidraw SVGs
  are generated ahead of time; editable scenes and freshness hashes remain.
  Optional MDX widgets have separate imports. Date labels reuse Intl formatters.
- **Retain fonts and animation with less work.** CMU WOFF2 core/extension subsets
  preserve coverage, outlines, metrics, and styles. The core subset step alone
  reduces four common WOFF2 faces from 92,924 to 59,744 bytes. Unchanged star
  frames retain their pixels; an empty asteroid layer is not cleared every frame.
  The footer reveal uses CSS and an intersection observer. Regression tests
  cover twinkle state, random draws, motion, final trail clearing, and font files.
- **Replace VisX with Dither Kit.** The official CLI installed area/bar charts and
  the shared engine, recording `apps/blog/dither-kit.json`. Analytics uses a p95
  area and p50 line. The route network uses native SVG and retains hover, focus,
  tooltips, zoom, wheel interaction, pan, and reset. Report charts use measured
  data, visible page keys, and an accessible table. Canvas greens sample the
  active Tailwind `--primary` and `--background`, including theme changes.

The retained software updates include Node 24.20.0, pnpm 11.25.0, Alchemy 0.94.0,
React 19.2.8, TanStack React Start 1.168.49, Fumadocs core/UI 16.15.7, Fumadocs MDX
15.4.0, and Wrangler 4.129.0. Dither CLI 0.1.1 installed registry components
0.1.0. See the vendor notes for official sources and local patches.

## Deployment and feature verification

The measured application revision is `78800cb04464616997a7356190c17fc200749125`.
[Deployment CI passed](https://github.com/cau1k/caulk.lol/actions/runs/33947734510).
Deployment used a push to `main`; no local production deployment was run.
An initial CI failure exposed an extensionless infrastructure import. The
explicit `.ts` import, matching TypeScript setting, and a native-Node import
regression test fixed it. Clean CI installation used the frozen lockfile.
The final handoff check also caught consumers of that exported TypeScript graph;
the import setting now lives in the shared base and standalone blog configs. CI checks workspace lint
and types before deployment. These final configuration/report commits follow the
measured application revision; it is not a new timing run.

Validation completed: full workspace build and typecheck; root lint; 19 blog
regressions; two infrastructure tests; three benchmark tests, including real
bandwidth/latency emulation; and font generator coverage/outline/metric checks.

The browser feature suite passed **35 local and 35 live checks** across all 20
pages and 15 public resources. It exercised navigation, mobile menu and focus,
theme controls/hotkey, archive/tag coverage, article copy/open controls, prose,
accordions, images, SVG diagrams, Links and previews, Analytics, stars, footer,
search, Markdown, and OG images. All four live articles match the final local
content fingerprints. A separate populated Analytics fixture passed theme
repainting, tooltip fields, zoom/wheel/pan/reset/focus, and mobile containment.
That intercepted fixture was never used for timing measurements.

## Measurement provenance and limits

- **Scope:** 20 canonical public HTML pages; admin pages and drafts excluded.
  Three samples in each of 80 origin/cache/page cells: 240 baseline and 240 final
  candidate samples. Final candidate samples contain zero errors.
- **Baseline:** first three complete balanced rounds from the preserved original
  run. Later rounds had a timeout and local preview exit. The 12 baseline
  Analytics React #418 errors remain recorded with their actual timings.
- **Interrupted final attempts:** `final-deployed` and `final-paired` are retained
  under `test-results/performance/`. Wrangler's CLI exited with a blank error;
  no application exception, OOM, or core dump established the cause.
- **Local preview difference:** the successful candidate used Wrangler's
  `unstable_startWorker` API with debugger, registry, and watching disabled. It
  ran the same production bundle, routing, local bindings, and persisted data.
  The baseline used the CLI. Local comparisons therefore also include a preview
  tooling change; the live comparison does not. Browser/timing code and its hash
  remained unchanged. The candidate's dirty flag records local harness/report
  work after the deployed commit, not unpublished application changes.
- **Network repair:** Docker interface churn interrupted `/posts` in
  `final-verified`. After that full run finished, the entire page was remeasured
  with three cold/warm rounds on both origins. All 12 `/posts` samples were
  replaced by `final-posts-repair`; the other 228 samples were retained. Selection
  was based on the infrastructure error, not duration. The merger rejects
  unknown/app errors, duplicate runs, changed profiles, and incomplete repairs.
- **Content changed:** Zero edited the Nietzsche and prompt-caching articles
  during the pass. Their timings include those content changes. The other two
  article fingerprints are unchanged from earlier checks.
- **Interpretation:** cold means an empty browser cache, not an empty Cloudflare
  cache. Local Links uses captured fixtures; local Analytics lacks production
  credentials. Readiness is a global startup/paint/font/data signal, not proof
  that every optional widget has hydrated. Separate interaction tests cover that
  gap. The single host and emulated connection do not represent all visitors;
  three samples do not support strong statistical confidence claims.

## Evidence and reproduction

Compressed raw measurements are preserved with this report:
[baseline](data/baseline.json.gz), [final candidate](data/candidate.json.gz),
[unrepaired full run](data/unrepaired.json.gz), and
[archive-page repair](data/repair.json.gz). They include individual timings,
resource waterfalls, response cache headers, long tasks, errors, and provenance.
Feature evidence: [local](data/features-local.json),
[live](data/features-live.json). Full screenshots and interrupted attempts remain
in the workspace's `test-results/performance/` directory.

```sh
PERF_CHROMIUM=/usr/bin/chromium pnpm perf --serve --runs 3 --label next
node scripts/performance/export.mjs \
  --baseline test-results/performance/baseline-complete-rounds.json \
  --candidate test-results/performance/final-complete.json \
  --notes docs/performance/verification.md
node scripts/performance/charts.mjs
```

Run comparisons only with matching browser/profile/hash and all required cells.
Keep build and browser jobs out of the timing run. Generated SVG/font and
TanStack patch tests belong in the upgrade gate. Dither update instructions and
local source adjustments live in
`apps/blog/src/components/dither-kit/NOTES.md`; the full suite is documented in
`scripts/performance/README.md`.
