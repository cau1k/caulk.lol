# Chart browser regressions

```sh
pnpm exec playwright install --with-deps chromium
pnpm test:browser
```

To use an installed Chromium locally:

```sh
PERF_CHROMIUM=/usr/bin/chromium pnpm test:browser
```

The suite starts a private Vite fixture using the actual performance chart,
published measurements, fonts, and Tailwind styles. It adds no public route and
requires no Cloudflare configuration or credentials.

Coverage: left/high/right bars, long headings, changes to a visible tooltip,
container resizing from 390 to 320 pixels, and light/dark themes at desktop and
mobile widths. Assertions intersect every CSS clipping ancestor and the viewport;
a DOM visibility check alone would miss the original cropped card.

The final suite was also run in an isolated checkout of the original published
revision, `4e13a51`, where its 14 individual cases failed. All 14 cases pass with
the fix (Node also reports four enclosing test groups). CI installs Chromium
and runs this suite before deployment.
