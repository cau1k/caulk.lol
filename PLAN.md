# Good Links Plan

## Goal

Add a low-friction "good links" system to caulk.lol without Markdown or a repo
restructure.

The feature should let Zero save links from multiple clients, annotate why they
matter, and publish a curated public page.

## Product Shape

- Public page: `/links`
- Public JSON endpoint: `GET /api/links`
- Authenticated write endpoint: `POST /api/links`
- Authenticated edit/archive endpoint: `PATCH /api/links/:id`
- Owner UI: `/admin/links`
- External clients:
  - iOS Shortcut first
  - CLI second
  - Chrome extension later

This should be a curated endorsement list, not a bookmark dump. The required
field is `reason`; that is the product.

## Architecture

Stay in the current single TanStack Start app.

```txt
src/
  routes/
    links.tsx
    admin/
      links.tsx
    api/
      auth/$.ts
      links.ts
      links/$id.ts
  lib/
    auth.ts
    links/
      schema.ts
      queries.ts
      validation.ts
      metadata.ts
migrations/
scripts/
  links-add.ts
```

No monorepo yet. Extract later only if the Chrome extension, CLI, or shared
client package becomes large enough to need its own build lifecycle.

## Storage

Use Cloudflare D1 as canonical storage.

Initial table:

```sql
create table good_links (
  id text primary key,
  url text not null unique,
  canonical_url text not null,
  title text not null,
  description text,
  reason text not null,
  tags text not null,
  status text not null default 'published',
  source text not null,
  created_at text not null,
  updated_at text not null
);

create index good_links_created_at_idx on good_links(created_at desc);
create index good_links_status_idx on good_links(status);
```

`tags` can start as JSON text. Add FTS or tag tables later only if the public
page needs richer search/filter behavior.

## Auth

Use Better Auth for owner auth and API key management.

- Mount Better Auth at `/api/auth/$`
- Use `tanstackStartCookies()` for browser cookie sessions
- Protect `/admin/*` with session checks
- Use the API Key plugin for iOS Shortcut, CLI, and Chrome extension writes
- Do not use Bearer plugin as the default external-client auth path

API keys should be owned by Zero's Better Auth user. Prefer permissions or
metadata over additional bespoke token tables.

## Endpoint Contract

`POST /api/links`

Auth:

- Better Auth session, or
- Better Auth API key with link-write permission

Payload:

```json
{
  "url": "https://example.com",
  "title": "Optional override",
  "description": "Optional override",
  "reason": "Why this is worth someone else's time",
  "tags": ["tools", "writing"],
  "source": "ios"
}
```

Rules:

- Normalize URL before insert
- Reject duplicates
- Fetch title/description when missing
- If metadata fetch fails and `title` is missing, return `400 title required`
- Validate with Zod
- Use D1 prepared statements
- Fail fast; no silent catches

## Build Order

1. Add D1 resource/binding and migration.
2. Add Better Auth config and `/api/auth/$`.
3. Add link validation, queries, and D1 access helpers.
4. Add `GET /api/links` and `POST /api/links`.
5. Add `/links` public page.
6. Add `/admin/links` protected management page.
7. Add iOS Shortcut request docs/example.
8. Add `scripts/links-add.ts` CLI.
9. Revisit Chrome extension after the API and admin UI feel right.

## Verification

- `bun run types:check`
- `bun run lint`
- `bun run build`
- Local create/list flow against D1 dev binding
- Browser check for `/links`
- Auth check:
  - anonymous write rejected
  - API key write accepted
  - admin session can edit/archive

## Non-Goals

- No Markdown source.
- No projects resurrection.
- No notes system.
- No monorepo restructure.
- No OAuth/social auth unless admin UX truly needs it.
- No fallback auth path.
