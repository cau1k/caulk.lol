import assert from "node:assert/strict";
import test from "node:test";
import { readPrerenderedPage } from "../src/lib/prerender.ts";

test("serves the built document without redirecting canonical public URLs", async () => {
  const urls = [];
  const response = await readPrerenderedPage(
    new Request("https://caulk.lol/posts/tags/ai?utm_source=test"),
    async (request) => {
      urls.push(request.url);
      return new Response("<h1>AI posts</h1>", {
        headers: { etag: '"build-hash"', "content-type": "text/html" },
      });
    },
  );
  assert.deepEqual(urls, ["https://caulk.lol/posts/tags/ai/index.html?utm_source=test"]);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<h1>AI posts</h1>");
  assert.equal(response.headers.get("etag"), '"build-hash"');
  assert.match(response.headers.get("cache-control"), /max-age=60/);
});

test("a missing prerender artifact fails explicitly instead of doing surprise runtime rendering", async () => {
  await assert.rejects(
    readPrerenderedPage(
      new Request("https://caulk.lol/"),
      async () => new Response("missing", { status: 404 }),
    ),
    /Missing prerendered page/,
  );
});

test("conditional requests retain 304 responses", async () => {
  const response = await readPrerenderedPage(
    new Request("https://caulk.lol/", { headers: { "if-none-match": '"build-hash"' } }),
    async (request) => {
      assert.equal(new URL(request.url).pathname, "/index.html");
      assert.equal(request.headers.get("if-none-match"), '"build-hash"');
      return new Response(null, { status: 304 });
    },
  );
  assert.equal(response.status, 304);
});
