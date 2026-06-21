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
