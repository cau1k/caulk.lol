# Public page performance

Run the production Worker locally, then measure local and live pages in the same
Chrome run. Do not benchmark Vite's development server. Do not run builds or other
browser suites concurrently with a measurement.

```sh
pnpm exec playwright install chromium
pnpm perf:serve --build
# In another terminal:
pnpm perf:test
pnpm perf --label baseline
pnpm perf:features --output test-results/performance/baseline-features
```

An existing Chromium can be selected with `PERF_CHROMIUM=/usr/bin/chromium` (all
commands), or `--chromium /path/to/chromium` (measurement and feature commands).
Keep that exact browser version for before/after comparisons. The build currently
requires the project's local Alchemy Wrangler configuration, as does ordinary
Worker preview. The runner fails if the production Worker bundle is absent.

`perf:serve` uses local workerd, the deployment's asset routing policy, isolated
local D1/KV state, the existing database migrations, and three public link fixtures
captured from the live Links page. It never deploys or connects remote bindings.
Local Analytics has no production Analytics Engine credentials; its source is
recorded by feature checks. Compare local against its own baseline and live
against its own baseline, not the two origins against each other.

The default measurement covers every published HTML route: static routes from
the route files, post slugs from frontmatter, and every published tag. Drafts and
admin pages are excluded. Unknown public parameter routes fail discovery. Raw
markdown, search, Analytics JSON, and each OG image have separate resource checks.

Each page gets five cold/warm pairs per origin. Origins and page order alternate;
pages run sequentially so they do not compete for resources. The default profile
is 1440×900, dark mode, 4× CPU slowdown, 10 Mbps download, 5 Mbps upload, and 40 ms
minimum request latency. `perf:test` includes a real local HTTP transfer test
that verifies Chrome actually applies the bandwidth and latency limits. No
Playwright request routing or response mocks are used: routing disables HTTP
caching, which would invalidate a warm-cache test.

- **Cold:** fresh browser context, cleared HTTP cache, empty site storage.
- **Warm:** another document navigation in the same context, retaining its HTTP
  cache. This includes revalidation if the site's cache policy requires it.
- **Edge cache:** `cf-cache-status`, `age`, and `cache-control` are saved separately.
  A fresh browser does not empty Cloudflare's cache or guarantee a cold Worker.
- **Load:** Navigation Timing `loadEventEnd`.
- **FCP/LCP:** real paint entries, with LCP observed through 700 ms after application
  readiness. This is an initial-viewport observation, not a full-session LCP.
- **Hydration:** first frame when the existing SSR theme control reflects the
  browser's dark preference. This is a global startup signal, not proof that every
  widget is ready. Feature checks exercise real event handlers separately.
- **Ready:** maximum of load, observed LCP, hydration, and Analytics fetch completion.
- **TTFB:** raw Navigation Timing `responseStart`. Chromium can record transport
  headers before DevTools applies its artificial delivery delay.

Reports include arithmetic means, median, p95, minimum/maximum, individual
samples, failures, long tasks, and resource waterfalls. Failed loads have no
invented timing. Recoverable browser errors retain their real timings and remain
marked as failures. Existing baseline errors can be fixed; current errors fail
the improvement gate.

After changing code and rebuilding/restarting the local server:

```sh
pnpm perf --label candidate --baseline test-results/performance/baseline.json
pnpm perf:features --baseline test-results/performance/baseline-features/results.json
```

The comparison exits unsuccessfully unless **every page/origin/cache cell** has
at least the baseline sample count and its mean load and ready times are both
at least 3× faster. Missing cells, changed browser/profile, and current errors
cannot pass. FCP and LCP ratios are reported alongside the gate. `--path /about`
and `--runs 1` are diagnostics; a subset cannot pass against the full baseline.
`--local off` or `--live off` allows individual-origin diagnosis. `--unthrottled`
uses the real host/network and requires a separate baseline.

The feature suite checks desktop/mobile navigation, theme switching and its
keyboard shortcut, published archive/tag coverage, article content fingerprints,
copy/open controls, accordions, image decoding, the Excalidraw diagram, links and
hover-preview responses, Analytics cards/source, stars, footer links, and public
resource types. Screenshots and JSON are under `test-results/performance/`.

The pinned TanStack Start plugin patch makes its module preloads include the full
static import graph. Without it, deeper dependencies are discovered only after
their parent modules download. `apps/blog/test/start-manifest.test.mjs` exercises
the installed builder, including cycles and dynamic imports. Recheck that test
when upgrading the plugin; remove the patch once upstream covers this behavior.

Font sources remain in `apps/blog/public/fonts/`. Regenerate the CMU WOFF2 core
and extension ranges with `apps/blog/scripts/fonts/woff2.py`; it requires
FontTools and the WOFF2 command-line tools. The generator checks coverage,
outlines, and metrics locally; Node-only asset freshness checks run in CI.

The Dither integration has a separate populated-data interaction check:
`PERF_CHROMIUM=/usr/bin/chromium node scripts/performance/dither.mjs` while the
local production server runs. It intercepts Analytics with a labeled fixture
to exercise theme repainting, tooltips, graph zoom/pan/reset/focus, and mobile
containment. This fixture is never used by the timing runner.

Export a completed paired run with `node scripts/performance/export.mjs
--baseline test-results/performance/baseline-complete-rounds.json --candidate
test-results/performance/final-deployed.json`. It rejects incomplete samples and
candidate errors, but reports the missed 3× cells accepted in the final scope.
Then run `node scripts/performance/charts.mjs` for eight light/dark PNGs rendered
from the site's actual Dither component and CSS. The renderer's temporary Vite
preview stays under ignored test results; it adds no public route.

References: [Playwright caching](https://playwright.dev/docs/api/class-browsercontext#browser-context-route),
[Chrome network emulation](https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-emulateNetworkConditionsByRule),
[Cloudflare asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
