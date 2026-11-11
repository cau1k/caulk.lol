import assert from "node:assert/strict";
import { test } from "node:test";

test("dev passkeys and device authorization use the dev admin origin", async (t) => {
  // Plugin configuration does not need a database. Prevent its module from
  // loading worker-only bindings while exercising the real Better Auth plugins.
  t.mock.module(new URL("../../db/src/index.ts", import.meta.url).href, {
    exports: { authSchema: {}, createDb: () => assert.fail("Unexpected database access") },
  });
  const { createAuthPlugins } = await import("../../auth/src/index.ts");
  for (const [api, admin] of [
    ["https://dev-api.caulk.lol", "https://dev-admin.caulk.lol"],
    ["https://api.caulk.lol", "https://admin.caulk.lol"],
  ]) {
    const plugins = createAuthPlugins({
      OWNER_EMAIL: "owner@example.com",
      BETTER_AUTH_URL: api,
      CORS_ORIGIN: `https://caulk.lol,${admin}`,
    });
    assert.equal(plugins.find((plugin) => plugin.id === "passkey").options.origin, admin);
    assert.equal(
      plugins.find((plugin) => plugin.id === "device-authorization").options.verificationUri,
      `${admin}/device`,
    );
  }
});
