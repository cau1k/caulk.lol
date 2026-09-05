import type { Plugin, Rollup } from "vite";

const virtualModuleId = "virtual:post-assets";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;
const clientEnvironmentName = "client";
const postModulePattern = /(?:^|\/)content\/posts\/([^/?]+)\.mdx\?collection=posts$/;

export type PostAssetMap = Record<string, string[]>;

type ChunkInfo = {
  fileName: string;
  facadeModuleId?: string | null;
  imports: string[];
  dynamicImports: string[];
  modules: Record<string, unknown>;
};

export type PostAssetChunk = Partial<ChunkInfo> & {
  type?: string;
  fileName: string;
};

export function collectPostAssetMap(chunks: Iterable<PostAssetChunk>): PostAssetMap {
  const chunksByFileName = new Map<string, ChunkInfo>();
  const entries = new Map<string, ChunkInfo>();

  for (const chunk of chunks) {
    if (chunk.type && chunk.type !== "chunk") continue;

    const normalized = normalizeChunk(chunk);
    chunksByFileName.set(normalized.fileName, normalized);

    const slug = getPostSlug(normalized);
    if (!slug) continue;
    if (entries.has(slug)) throw new Error(`Duplicate post asset entry for ${slug}`);
    entries.set(slug, normalized);
  }

  return Object.fromEntries(
    [...entries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slug, chunk]) => [slug, collectStaticAssets(chunk, chunksByFileName)]),
  );
}

export function postAssetsPlugin(): Plugin {
  let postAssetMap: PostAssetMap | undefined;
  let command: "build" | "serve" = "serve";

  return {
    name: "caulk-post-assets",
    enforce: "post",
    configResolved(config) {
      command = config.command;
    },
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return;
      if (command !== "build") return "export default {};";

      if (isClientEnvironment(this.environment)) return "export default {};";
      if (!isServerEnvironment(this.environment)) {
        throw new Error(
          `Unexpected post asset virtual module environment: ${this.environment.name}`,
        );
      }
      if (!postAssetMap) {
        throw new Error(
          "Missing post asset map. Add postAssetsPlugin() before tanstackStart() so the shared plugin instance sees the client build before the server build loads virtual:post-assets.",
        );
      }
      if (Object.keys(postAssetMap).length === 0) {
        throw new Error("Post asset map is empty for production build.");
      }

      return `export default ${JSON.stringify(postAssetMap)};`;
    },
    generateBundle(_options, bundle: Rollup.OutputBundle) {
      if (!isClientEnvironment(this.environment)) return;

      const map = collectPostAssetMap(
        Object.values(bundle).filter(
          (asset): asset is Rollup.OutputChunk => asset.type === "chunk",
        ),
      );
      if (Object.keys(map).length === 0) {
        throw new Error("Client build did not contain any post MDX asset entries.");
      }

      postAssetMap = map;
    },
  };
}

type PluginEnvironment = {
  name: string;
  config: { consumer?: "client" | "server" };
};

function isClientEnvironment(environment: PluginEnvironment) {
  return environment.name === clientEnvironmentName;
}

function isServerEnvironment(environment: PluginEnvironment) {
  return environment.config.consumer === "server";
}

function normalizeChunk(chunk: PostAssetChunk): ChunkInfo {
  return {
    fileName: chunk.fileName,
    facadeModuleId: chunk.facadeModuleId,
    imports: chunk.imports ?? [],
    dynamicImports: chunk.dynamicImports ?? [],
    modules: chunk.modules ?? {},
  };
}

function getPostSlug(chunk: ChunkInfo) {
  return [chunk.facadeModuleId, ...Object.keys(chunk.modules)]
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.match(postModulePattern)?.[1])
    .find((slug): slug is string => Boolean(slug));
}

function collectStaticAssets(entry: ChunkInfo, chunksByFileName: Map<string, ChunkInfo>) {
  const assets: string[] = [];
  const seen = new Set<string>();

  function visit(chunk: ChunkInfo) {
    if (seen.has(chunk.fileName)) return;
    seen.add(chunk.fileName);
    assets.push(`/${chunk.fileName}`);

    for (const importedFileName of chunk.imports) {
      const importedChunk = chunksByFileName.get(importedFileName);
      if (importedChunk) visit(importedChunk);
    }
  }

  visit(entry);
  return assets;
}
