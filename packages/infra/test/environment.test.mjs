import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "yaml";
import { blogAssets } from "../assets.ts";

// Load the real deployment entry with provider effects replaced. This verifies
// resource bindings without creating Cloudflare resources or reading local secrets.
async function deployment(t, args = [], local = false) {
  const previousArgv = process.argv;
  process.argv = [process.execPath, "alchemy.run.ts", ...args];
  const values = {
    STAGE: "prod",
    BETTER_AUTH_SECRET: "test-secret",
    ADMIN_BOOTSTRAP_TOKEN: "test-bootstrap",
    BETTER_AUTH_URL: "http://localhost:3001",
    CORS_ORIGIN: "http://localhost:3000,http://localhost:3002",
    OWNER_EMAIL: "owner@example.com",
    CLOUDFLARE_ZONE_ID: "test-zone",
  };
  const previousEnv = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    process.argv = previousArgv;
    Object.entries(previousEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }
      process.env[key] = value;
    });
  });

  const resources = {};
  let stage;
  const alchemy = Object.assign(
    async (name, options) => {
      // Alchemy 0.94: explicit options override its CLI/environment resolution.
      const stageIndex = process.argv.indexOf("--stage");
      stage = options.stage ?? (stageIndex >= 0 ? process.argv[stageIndex + 1] : process.env.STAGE);
      return { name, stage, local, finalize: async () => {} };
    },
    { secret: (value) => value },
  );
  const resource = (id, props) => {
    resources[id] = props;
    return { id, url: `https://${id}.test.workers.dev` };
  };
  t.mock.module("alchemy", { exports: { default: alchemy } });
  t.mock.module("alchemy/cloudflare", {
    exports: {
      AnalyticsEngineDataset: resource,
      D1Database: resource,
      EmailSender: (props) => props,
      KVNamespace: resource,
      TanStackStart: resource,
      Worker: resource,
    },
  });
  t.mock.module("alchemy/state", { exports: { CloudflareStateStore: class {} } });
  t.mock.module("dotenv", { exports: { config: () => {} } });

  await import(`../alchemy.run.ts?test=${t.name}`);
  return { stage, resources };
}

test("--stage dev overrides a production .env and isolates deployed resources", async (t) => {
  const { stage, resources } = await deployment(t, ["--stage", "dev"]);
  assert.equal(stage, "dev");
  assert.equal(resources.blog.domains[0].domainName, "dev.caulk.lol");
  assert.equal(resources.admin.domains[0].domainName, "dev-admin.caulk.lol");
  assert.equal(resources.server.domains[0].domainName, "dev-api.caulk.lol");
  assert.equal(resources["links-db"].name, "caulk-lol-dev-links");
  assert.equal(resources["tweet-cache"].title, "caulk-lol-dev-tweet-cache");
  assert.equal(resources["link-preview-cache"].title, "caulk-lol-dev-link-preview-cache");
  assert.equal(resources["site-metrics"].dataset, "CAULK_SITE_METRICS_DEV");
  for (const id of ["blog", "admin", "server"]) {
    assert.equal(resources[id].bindings.BETTER_AUTH_URL, "https://dev-api.caulk.lol");
    assert.equal(
      resources[id].bindings.CORS_ORIGIN,
      "https://dev.caulk.lol,https://dev-admin.caulk.lol",
    );
  }
  assert.equal(resources.blog.bindings.VITE_SERVER_URL, "https://dev-api.caulk.lol");
  assert.deepEqual(resources.blog.assets, blogAssets);
});

test("production keeps its existing domains, resource names, and analytics dataset", async (t) => {
  const { stage, resources } = await deployment(t);
  assert.equal(stage, "prod");
  assert.equal(resources.blog.domains[0].domainName, "caulk.lol");
  assert.equal(resources.admin.domains[0].domainName, "admin.caulk.lol");
  assert.equal(resources.server.domains[0].domainName, "api.caulk.lol");
  assert.equal(resources["links-db"].name, "caulk-lol-prod-links");
  assert.equal(resources["site-metrics"].dataset, "CAULK_SITE_METRICS");
  assert.equal(resources.server.bindings.BETTER_AUTH_URL, "https://api.caulk.lol");
  assert.equal(resources.blog.bindings.VITE_SERVER_URL, "https://api.caulk.lol");
  assert.equal(resources.blog.url, false);
  assert.equal(resources.admin.url, false);
  assert.equal(resources.server.url, true);
});

test("local dev emulates resources without claiming hosted domains", async (t) => {
  const { resources } = await deployment(t, ["--stage", "dev", "--dev"], true);
  for (const id of ["blog", "admin", "server"]) {
    assert.equal(resources[id].domains, undefined);
    assert.equal(resources[id].bindings.BETTER_AUTH_URL, "http://localhost:3001");
    assert.equal(resources[id].bindings.CORS_ORIGIN, "http://localhost:3000,http://localhost:3002");
  }
  assert.deepEqual(resources.blog.assets, { run_worker_first: false });
});

test("CI maps dev and main to independent deployments", async () => {
  const workflow = parse(
    await readFile(new URL("../../../.github/workflows/deploy.yml", import.meta.url), "utf8"),
  );
  assert.deepEqual(workflow.on.push.branches, ["main", "dev"]);
  assert.equal(workflow.env.STAGE, "${{ github.ref_name == 'main' && 'prod' || 'dev' }}");
  assert.equal(workflow.concurrency.group, "deploy-${{ github.ref_name }}");
  const turbo = JSON.parse(await readFile(new URL("../../../turbo.json", import.meta.url), "utf8"));
  assert.ok(
    turbo.tasks.build.env?.includes("VITE_SERVER_URL"),
    "Builds must pass and hash the selected API URL",
  );
});
