import assert from "node:assert/strict";
import test from "node:test";
import { collectPostAssetMap, postAssetsPlugin } from "../plugins/posts.ts";

test("collects exact article entry and static imports only", () => {
  const map = collectPostAssetMap(articleChunks());

  assert.deepEqual(map["article-a"], [
    "/assets/article-a.js",
    "/assets/jsx.js",
    "/assets/shared.js",
    "/assets/cycle.js",
  ]);
  assert.deepEqual(map["article-b"], [
    "/assets/article-b.js",
    "/assets/shared.js",
    "/assets/cycle.js",
  ]);
  assert.equal(map.missing, undefined);
  assert(!map["article-a"].includes("/assets/widget.js"));
});

test("throws when one article has duplicate emitted entries", () => {
  assert.throws(
    () =>
      collectPostAssetMap([
        chunk("assets/one.js", {
          facadeModuleId: "/repo/apps/blog/content/posts/article-a.mdx?collection=posts",
        }),
        chunk("assets/two.js", {
          modules: {
            "/repo/apps/blog/content/posts/article-a.mdx?collection=posts": {},
          },
        }),
      ]),
    /Duplicate post asset entry for article-a/,
  );
});

test("virtual module lifecycle keeps map out of client and exposes it after client bundle", () => {
  const plugin = postAssetsPlugin();
  plugin.configResolved?.({ command: "build" });

  assert.throws(
    () => plugin.load.call(context("ssr", "server"), "\0virtual:post-assets"),
    /Missing post asset map/,
  );

  plugin.generateBundle.call(context("client", "client"), {}, bundle(articleChunks()));

  assert.equal(
    plugin.load.call(context("client", "client"), "\0virtual:post-assets"),
    "export default {};",
  );
  assert.match(
    plugin.load.call(context("ssr", "server"), "\0virtual:post-assets"),
    /"article-a":\["\/assets\/article-a\.js","\/assets\/jsx\.js","\/assets\/shared\.js","\/assets\/cycle\.js"\]/,
  );
  assert.throws(
    () => plugin.load.call(context("worker", "client"), "\0virtual:post-assets"),
    /Unexpected post asset virtual module environment: worker/,
  );
});

function articleChunks() {
  return [
    chunk("assets/article-a.js", {
      facadeModuleId: "/repo/apps/blog/content/posts/article-a.mdx?collection=posts",
      modules: {
        "/repo/apps/blog/content/posts/article-a.mdx?collection=posts": {},
      },
      imports: ["assets/jsx.js", "assets/shared.js"],
      dynamicImports: ["assets/widget.js"],
    }),
    chunk("assets/article-b.js", {
      facadeModuleId: "/repo/apps/blog/content/posts/article-b.mdx?collection=posts",
      modules: {
        "/repo/apps/blog/content/posts/article-b.mdx?collection=posts": {},
      },
      imports: ["assets/shared.js"],
    }),
    chunk("assets/jsx.js"),
    chunk("assets/shared.js", { imports: ["assets/cycle.js"] }),
    chunk("assets/cycle.js", { imports: ["assets/shared.js"] }),
    chunk("assets/widget.js"),
  ];
}

function chunk(fileName, options = {}) {
  return {
    type: "chunk",
    fileName,
    imports: [],
    dynamicImports: [],
    modules: {},
    ...options,
  };
}

function bundle(chunks) {
  return Object.fromEntries(chunks.map((chunk) => [chunk.fileName, chunk]));
}

function context(name, consumer) {
  return { environment: { name, config: { consumer } } };
}
