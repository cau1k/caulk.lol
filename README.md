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

## Development environment

GitHub Actions deploys each branch to its own [Alchemy stage](https://v1.alchemy.run/concepts/apps-and-stages/):

| Branch | Stage  | Blog            | API                 | Admin                 |
| ------ | ------ | --------------- | ------------------- | --------------------- |
| `main` | `prod` | `caulk.lol`     | `api.caulk.lol`     | `admin.caulk.lol`     |
| `dev`  | `dev`  | `dev.caulk.lol` | `dev-api.caulk.lol` | `dev-admin.caulk.lol` |

Work on `dev`, push, then wait for the Deploy workflow to pass. Promote the tested
code by merging `dev` into `main` and pushing `main`; that runs the production
deployment. Deploy through CI, not from this machine.

Each stage has separate Workers, D1 data (including auth), KV caches, and analytics.
Dev uses `CAULK_SITE_METRICS_DEV`; production keeps `CAULK_SITE_METRICS`.
Dev starts with an empty database and applies the existing generated migrations.
Sign in separately; promotion moves code and applies migrations, never copies dev
accounts, links, or analytics into production.

Admin bookmarklets and CLI login instructions follow the current environment.
Copied dev CLI commands export `CAULK_SERVER_URL` and a separate
`CAULK_CONFIG_DIR` (`~/.config/caulk-dev`) for that shell session.

Both stages use the existing repository Cloudflare/auth deployment secrets. Named
stages derive their API URL and trusted origins from the domain table in
`packages/infra/alchemy.run.ts`; local `.env` production URLs cannot redirect a dev
deployment to production. CI serializes deployments within each branch.

`pnpm dev` still runs local emulation. `alchemy dev --stage dev` selects dev data
locally without claiming the hosted development domains. The `--stage` flag takes
precedence over `STAGE` in `.env`.

## Workspace commands

```bash
pnpm install
pnpm dev
VITE_SERVER_URL=http://localhost:3001 pnpm build
pnpm check-types
pnpm deploy
```

`pnpm dev` and `pnpm deploy` run `packages/infra` through Turbo. Alchemy starts/provisions the blog, admin, server, D1, KV, and Analytics Engine resources.

Standalone builds require `VITE_SERVER_URL`; use `https://dev-api.caulk.lol` for a
dev-target build. Alchemy supplies it from the selected stage during deployment.
Turbo passes this variable through and includes it in the build cache key.

Useful focused commands:

```bash
pnpm dev:blog
pnpm dev:admin
pnpm db:generate
pnpm links:add <url> --reason <text>
```

## Local env

Copy `.env.example` to `.env` and fill Cloudflare, auth, CORS, and owner values before running Alchemy.
