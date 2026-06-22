# AGENTS.md

## Commands

- `pnpm dev` - dev server
- `pnpm build` - production build
- `pnpm types:check` - typecheck (runs fumadocs-mdx first)
- `pnpm lint` - biome check
- `pnpm format` - biome format

## Deploying

- Use git push to deploy to prod. Do not deploy from this machine. Watch CI for any failures. Do the simplest fix possible if a failure occurs, then push again and watch.

## Code Style

- **Formatting**: 2-space indent, biome handles organization
- **Types**: strict mode, never use `any`, use `type` over `interface`, use package types before creating custom ones
- **Naming**: camelCase for vars/functions, PascalCase for components/types
- **Components**: use CVA for variants, `cn()` from `@/lib/cn` for class merging
- **Error handling**: fail fast, no silent catches

## Contributor Guidelines

This project should be built with care and common sense.

- Use trpc for all frontend calls. Do not arbitratily call the backend without trpc.
- Database should be broken up into logical schema files, not just one big schema file.
- Always commit early, often, and logically. Always fix commit issues.
- **Do not manually write auth schema or DB migrations. Ever. No exceptions.** Better Auth schema is generated only with `npm run auth:generate`. Drizzle migrations are generated only from schema with `npm run db:generate`. If auth plugins change, run `npm run auth:generate` first, then `npm run db:generate`. For every database change, edit source schema only; never hand-write migration SQL or hand-edit migration snapshots. Hand-written auth tables are forbidden. Hand-written migrations are forbidden. If generated output looks wrong, fix the source schema/config and regenerate.

# Contributor Guidelines

## Git Hooks and Linting/Formatting/Checking

- Do not do top-level oxlint ignores. You must do them line by line with a valid reason.
- Rules are enforced for a reason.
- We use lefthook

## Code Style

Do not do top-level oxlint ignores. You must do them line by line.

## Organization

- Prefer single word file names. Like api.ts and redis.ts, but not internal-api.ts or redis-service.ts. Do not use kebab case unless absolutely necessary. Kebab case is okay for tests.
- Additionally, nesting files in directories related to a subdomain is great. For instance if we have src/services/workflow/index.ts, and we want to add an "iterate" workflow, we can add a src/services/workflow/iterate/index.ts, provider.ts, etc. Just for example.

## Complex Logic

When a function has several validation branches or supporting details, make the main function read as the happy path and move supporting details into small helpers below it.

```ts
// Good
export function loadThing(input: unknown) {
  const config = requireConfig(input)
  const metadata = readMetadata(input)
  return createThing({ config, metadata })
}

function requireConfig(input: unknown) {
  ...
}
```

- Keep helpers close to the code they support, below the main export when that improves readability.
- Do not over-abstract simple expressions into many single-use helpers; extract only when it names a real concept like `requireConfig` or `readMetadata`.
- Add comments for non-obvious constraints and surprising behavior, not for obvious assignments or control flow.

## General Principles

- Keep things in one function unless composable or reusable
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Avoid using the `any` type
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json();

// Bad
const journalPath = path.join(dir, "journal.json");
const journal = await Bun.file(journalPath).json();
```

## Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1;
  return 2;
}

// Bad
function foo() {
  if (condition) return 1;
  else return 2;
}
```

## Shadcn UI

- Do not add arbitrary rounding classes to existing shadcn-svelte customized components. If creating a new component, use the standard rounding classes already established in the local design system. Prefer to extend the existing shadcn-svelte components that are "vendored" in ./apps/web/src/components/ui. Do not use custom tailwind colors outside of those defined in app.css
- Try to componentize where it makes sense.

# Workspace Map

## Apps

- `apps/web`: public TanStack Start web app for the Simply Susan site. Owns public pages, the `/contact` schedule-call conversational form, public branding/header/footer, and web-specific form wiring. Do not put admin-only routes or admin layout logic here.
- `apps/admin`: separate TanStack Start admin app intended for `admin.simplysusanconsulting.com`. Owns admin login, sidebar shell, protected form-submission table, and admin-only UI. Uses `simplysusan-admin` for evlog service identity.
- `apps/server`: Hono worker API server. Owns Better Auth route handling, tRPC mounting, CORS, evlog request logging, and server/API runtime composition.

## Packages

- `packages/api`: tRPC API contract and routers. Keep router schemas next to their router folders; see `packages/api/AGENTS.md`. Frontends should call backend behavior through this package/tRPC.
- `packages/auth`: Better Auth configuration, admin gate hooks, passkey/email OTP plugins, API key/bearer plugins, and Polar auth integration. Do not hand-write auth schema; regenerate via the root auth script when auth plugins/schema change.
- `packages/db`: Drizzle database connection, logical schema files, and generated migrations/snapshots. Edit source schema only; generate migrations with `npm run db:generate`.
- `packages/forms`: headless conversational form SDK over TanStack Form/Zod. Owns form definitions, field/step engine, generic serialization, validation helpers, React provider/hooks, error regions, and save/status plumbing. UI components live in apps or `packages/ui`, not here.
- `packages/ui`: shared design-system primitives and shadcn-style components used by web/admin. Prefer extending these components before creating app-local primitives.
- `packages/env`: typed environment access for server and web/client code. Server env comes from Cloudflare bindings; web env exposes `VITE_*` values.
- `packages/infra`: Alchemy/Cloudflare infrastructure definition. Owns D1, server worker, public web app, admin app, email sender bindings, and deploy/dev/destroy scripts.
- `packages/cli`: internal `simplysusan` CLI for API-driven operational tasks such as report creation.
- `packages/config`: shared workspace config placeholder/package for common tooling dependencies.
