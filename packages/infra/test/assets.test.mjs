import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Alchemy asset policy loads through native Node ESM", async () => {
  const entry = new URL("../alchemy.run.ts", import.meta.url);
  const source = await readFile(entry, "utf8");
  const specifier = source.match(/import \{ blogAssets \} from "([^"]+)";/)?.[1];
  assert.ok(specifier, "Missing shared asset policy import");
  // Import only the policy, never the deployment entry with Cloudflare effects.
  // Use its exact specifier: Vite accepts extensionless paths that Node rejects.
  const { blogAssets } = await import(new URL(specifier, entry).href);
  assert.equal(blogAssets.html_handling, "none");
  assert.ok(blogAssets.run_worker_first.includes("/*"));
});
