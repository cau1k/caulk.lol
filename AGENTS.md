# AGENTS.md

## Commands
- `pnpm dev` - dev server
- `pnpm build` - production build
- `pnpm types:check` - typecheck (runs fumadocs-mdx first)
- `pnpm lint` - biome check
- `pnpm format` - biome format

## Code Style
- **Formatting**: 2-space indent, biome handles organization
- **Imports**: use `@/*` alias for `./src/*`; biome auto-organizes imports
- **Types**: strict mode, never use `any`, use `type` over `interface`, use package types before creating custom ones
- **Naming**: camelCase for vars/functions, PascalCase for components/types
- **Components**: use CVA for variants, `cn()` from `@/lib/cn` for class merging
- **Error handling**: fail fast, no silent catches

## Stack
React 19, TanStack Router, Fumadocs (MDX), Tailwind v4, Vite 7, TypeScript strict mode
