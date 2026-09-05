# caulk.lol

Monorepo for caulk.lol, based on the Better-T-Stack Cloudflare scaffold.

## Apps

- `apps/blog` - existing TanStack Start + Fumadocs blog
- `apps/admin` - TanStack Start admin app scaffold
- `apps/server` - Hono Worker API with tRPC and Better Auth

## Packages

- `packages/auth` - Better Auth configuration
- `packages/api` - tRPC router and context
- `packages/db` - Drizzle schema and D1 migrations
- `packages/env` - Cloudflare/runtime env helpers
- `packages/infra` - Alchemy Cloudflare infra, dev, deploy
- `packages/ui` - shared UI primitives

Standalone Worker packages belong in `workers/*`.

## Commands

Use Node.js 24 LTS and pnpm 11.25.0 (pinned in `package.json` and CI).

Dependency updates use stable npm releases. Two compatibility holds remain:

- TypeScript 6.0.3: Twoslash needs the compiler API, and tsdown's TypeScript 7
  declaration support remains experimental.
- Better Auth 1.6.30: version 1.7 requires an account identity backfill and a
  rehearsed database cutover. Follow the
  [1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide)
  before updating the auth packages together. Do not apply a plain generated
  schema migration to a populated 1.6 database.

Alchemy stays on stable 0.94.0; its npm `latest` tag currently selects a v2 beta.
Security overrides in `pnpm-workspace.yaml` patch vulnerable transitive ranges.
The workspace permits same-day releases (`minimumReleaseAge: 0`).

Validate dependency updates with `pnpm lint`, `pnpm check-types`, `pnpm build`,
and `pnpm audit`. The blog build also compiles MDX and prerenders public pages.
Production deployment runs through GitHub Actions after a push to `main`.

```bash
pnpm install
pnpm dev
pnpm build
pnpm check-types
pnpm deploy
```

`pnpm dev` and `pnpm deploy` run `packages/infra` through Turbo. Alchemy starts/provisions the blog, admin, server, D1, KV, and Analytics Engine resources.

Useful focused commands:

```bash
pnpm dev:blog
pnpm dev:admin
pnpm db:generate
pnpm links:add <url> --reason <text>
```

## Local env

Copy `.env.example` to `.env` and fill Cloudflare, auth, CORS, and owner values before running Alchemy.
