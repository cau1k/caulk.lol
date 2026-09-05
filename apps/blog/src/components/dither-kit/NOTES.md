# Dither Kit vendor notes

Installed with the pinned CLI used for this site:

```sh
pnpm dlx @dither-kit/cli@0.1.1 add area-chart --dir apps/blog
pnpm dlx @dither-kit/cli@0.1.1 add bar-chart --dir apps/blog
```

Sources checked 2026-09-05:

- https://www.tripwire.sh/dither-kit
- https://tripwire.sh/r/area-chart.json
- https://tripwire.sh/r/bar-chart.json
- `npm view @dither-kit/cli version dist-tags.latest time --json`

Local changes from generated files:

- `palette.ts` adds `primary` and `primaryMuted`, resolving them from the live CSS `--primary` and `--background` variables. This keeps the canvas charts aligned with light/dark theme instead of freezing sampled RGB values.
- `area.tsx` allows `<Line>` inside `<AreaChart>`. The shared cartesian canvas already supports line series there, and mixed area/line charts need it for comparison overlays.
- Canvas paint signatures include resolved RGB values so changing themes repaints existing series.
- `dither-paint.ts` uses `Array.from({ length })` for the project's `unicorn/no-new-array` lint rule.
- `chart-context.tsx` and `polar-context.tsx` omit stable React state setters from hook dependency arrays for the project's exhaustive-deps lint rule.
