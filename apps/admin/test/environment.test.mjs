import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { cliLogin, linkShortcut } from "../src/lib/environment.ts";

test("the dev bookmarklet opens the dev admin with the selected page", () => {
  const location = { href: "https://example.com/article?one=two" };
  const shortcut = linkShortcut("https://dev-api.caulk.lol");
  runInNewContext(shortcut.slice("javascript:".length), {
    location,
    document: { title: "A useful article" },
    URLSearchParams,
  });
  const destination = new URL(location.href);
  assert.equal(destination.origin, "https://dev-admin.caulk.lol");
  assert.equal(destination.pathname, "/links/add");
  assert.equal(destination.searchParams.get("url"), "https://example.com/article?one=two");
  assert.equal(destination.searchParams.get("title"), "A useful article");
});

test("copied dev CLI commands keep credentials and API separate from production", () => {
  for (const option of ["--device-auth", "--api-key <key>"]) {
    const command = cliLogin("https://dev-api.caulk.lol", option);
    assert.ok(command.includes('export CAULK_CONFIG_DIR="$HOME/.config/caulk-dev"'));
    assert.ok(command.includes("export CAULK_SERVER_URL=https://dev-api.caulk.lol"));
    assert.ok(command.endsWith(`caulk auth login ${option}`));
  }
});
