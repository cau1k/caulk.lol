# Editable diagrams

Keep `.excalidraw` sources in `apps/blog/public/`. After editing or adding a scene,
run `pnpm --filter blog diagrams:generate` from the repository root and commit the
source plus `apps/blog/src/generated/diagrams/` output.

Generation uses the installed Excalidraw exporter in a headless Playwright browser.
Point `CHROMIUM_PATH` at a local Chromium executable if Playwright's browser is not
installed, for example:

```sh
CHROMIUM_PATH=/usr/bin/chromium pnpm --filter blog diagrams:generate
```

The React component inlines only these trusted, local generated SVG files. Inline
SVG inherits the page's theme colors and serif font; loading an SVG through an
`img` would lose that styling. Layout and shapes come from Excalidraw's exporter,
with its font embedding disabled because the site supplies the font.

`pnpm --filter blog test` checks source, exporter/generator, and SVG hashes. CI and
normal builds need no browser. A changed source or generator requires regeneration;
there is no runtime exporter or remote SVG loading path.
