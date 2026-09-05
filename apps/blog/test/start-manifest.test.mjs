import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

async function importManifestBuilder() {
  const blogRequire = createRequire(new URL("../package.json", import.meta.url));
  const reactStartRequire = createRequire(
    blogRequire.resolve("@tanstack/react-start/package.json"),
  );
  const packageRoot = dirname(
    reactStartRequire.resolve("@tanstack/start-plugin-core/package.json"),
  );

  return import(
    pathToFileURL(join(packageRoot, "dist/esm/start-manifest-plugin/manifestBuilder.js")).href
  );
}

function chunk(fileName, imports = [], dynamicImports = []) {
  return {
    fileName,
    imports,
    dynamicImports,
    isEntry: fileName === "assets/index.js",
    css: [],
    routeFilePaths: [],
    hydrationIds: [],
  };
}

test("Start manifest preloads transitive static imports without preloading dynamic imports", async () => {
  const { buildStartManifest } = await importManifestBuilder();
  const manifest = buildStartManifest({
    basePath: "/",
    routeTreeRoutes: { __root__: { filePath: "/src/routes/__root.tsx" } },
    clientBuild: {
      entryChunkFileName: "assets/index.js",
      chunksByFileName: new Map([
        ["assets/index.js", chunk("assets/index.js", ["assets/direct.js"], ["assets/dynamic.js"])],
        ["assets/direct.js", chunk("assets/direct.js", ["assets/leaf.js"])],
        ["assets/leaf.js", chunk("assets/leaf.js", ["assets/direct.js"])],
        ["assets/dynamic.js", chunk("assets/dynamic.js", ["assets/dynamic-leaf.js"])],
        ["assets/dynamic-leaf.js", chunk("assets/dynamic-leaf.js")],
      ]),
      chunkFileNamesByRouteFilePath: new Map(),
      cssFilesBySourcePath: new Map(),
      cssContentByFileName: new Map(),
    },
  });

  assert.deepEqual(manifest.routes.__root__.preloads, [
    "/assets/index.js",
    "/assets/direct.js",
    "/assets/leaf.js",
  ]);
});
