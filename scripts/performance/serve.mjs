import { spawnSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { blogAssets } from "../../packages/infra/assets.ts";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "4317" },
    build: { type: "boolean", default: false },
    directory: { type: "string", default: "apps/blog/dist" },
  },
});
const root = fileURLToPath(new URL("../../", import.meta.url));
const state = path.join(root, "test-results/performance/local");
const configPath = path.join(state, "wrangler.json");
if (values.build) {
  const build = spawnSync("pnpm", ["--filter", "blog", "build"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
const directory = path.resolve(root, values.directory);
const builtConfig = JSON.parse(
  await readFile(path.join(directory, "server/wrangler.json"), "utf8"),
);
// This is local workerd running the production bundle and asset routing. No
// remote bindings, Cloudflare login, deployment, or production writes are used.
const config = {
  name: "caulk-performance",
  main: path.join(directory, "server/index.js"),
  compatibility_date: builtConfig.compatibility_date,
  compatibility_flags: builtConfig.compatibility_flags,
  no_bundle: true,
  rules: builtConfig.rules,
  assets: { ...builtConfig.assets, directory: path.join(directory, "client"), ...blogAssets },
  vars: {
    CORS_ORIGIN: `http://127.0.0.1:${values.port}`,
    BETTER_AUTH_URL: "http://127.0.0.1:3001",
    VITE_SERVER_URL: "http://127.0.0.1:3001",
    BETTER_AUTH_SECRET: "local-performance-fixture-secret-only",
    ADMIN_BOOTSTRAP_TOKEN: "local-performance-fixture-token-only",
    OWNER_EMAIL: "performance@example.invalid",
  },
  kv_namespaces: builtConfig.kv_namespaces,
  analytics_engine_datasets: builtConfig.analytics_engine_datasets,
  d1_databases: builtConfig.d1_databases.map((db) => ({
    ...db,
    migrations_dir: path.join(root, "packages/db/src/migrations"),
  })),
};
await mkdir(state, { recursive: true });
await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
const migrate = spawnSync(
  "pnpm",
  [
    "--filter",
    "blog",
    "exec",
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    configPath,
    "--persist-to",
    state,
  ],
  { cwd: root, stdio: "inherit" },
);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);
// Public link content is snapshotted into local D1, not intercepted in the
// browser. DML fixtures use the existing generated schema; no schema/migration
// SQL is authored by this suite. Upserts keep repeated startup idempotent.
const links = JSON.parse(await readFile(new URL("./links.json", import.meta.url), "utf8"));
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const statements = links.map(
  (link) => `INSERT INTO good_links
  (id, url, canonical_url, title, reason, tags, status, source, created_at, updated_at)
  VALUES (${[link.id, link.url, link.url, link.title, link.reason, "[]", "published", "performance-fixture", link.createdAt, link.createdAt].map(literal).join(",")})
  ON CONFLICT(id) DO UPDATE SET title=excluded.title, reason=excluded.reason;`,
);
const seedPath = path.join(state, "seed.sql");
await writeFile(seedPath, statements.join("\n"));
const seed = spawnSync(
  "pnpm",
  [
    "--filter",
    "blog",
    "exec",
    "wrangler",
    "d1",
    "execute",
    "DB",
    "--local",
    "--config",
    configPath,
    "--persist-to",
    state,
    "--file",
    seedPath,
  ],
  { cwd: root, stdio: "inherit" },
);
if (seed.status !== 0) process.exit(seed.status ?? 1);
const child = spawn(
  "pnpm",
  [
    "--filter",
    "blog",
    "exec",
    "wrangler",
    "dev",
    "--local",
    "--config",
    configPath,
    "--persist-to",
    state,
    "--port",
    values.port,
    "--log-level",
    "warn",
    "--show-interactive-dev-session",
    "false",
  ],
  { cwd: root, stdio: "inherit", env: { ...process.env, CI: "true", NO_COLOR: "1" } },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
