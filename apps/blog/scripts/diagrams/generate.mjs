import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import { blog, digest, fingerprint, output, sourceFiles } from "./files.mjs";

// Keep regeneration separate from builds: CI validates hashes without launching Chrome.
const server = await createServer({
  configFile: false,
  root: fileURLToPath(blog),
  server: { host: "127.0.0.1", port: 0 },
  optimizeDeps: { entries: ["scripts/diagrams/browser.ts"] },
  plugins: [
    {
      name: "diagram-export-page",
      configureServer(vite) {
        vite.middlewares.use("/__diagrams", (_request, response) => {
          response.setHeader("content-type", "text/html");
          response.end("<!doctype html><title>Diagram generation</title>");
        });
      },
    },
  ],
});

await server.listen();
try {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const address = server.httpServer.address();
    if (!address || typeof address === "string")
      throw new Error("Missing generator server address");
    await page.goto(`http://127.0.0.1:${address.port}/__diagrams`);
    const scenes = [];
    for (const source of await sourceFiles()) {
      const sourceData = await readFile(new URL(`public/${source}`, blog), "utf8");
      const sourceHash = digest(sourceData);
      const existing = scenes.find((entry) => entry.sourceHash === sourceHash);
      if (existing) {
        scenes.push({ ...existing, source: `/${source}` });
        continue;
      }
      const scene = JSON.parse(sourceData);
      if (scene.type !== "excalidraw" || !Array.isArray(scene.elements)) {
        throw new Error(`Invalid Excalidraw source: ${source}`);
      }
      const { svg, ...dimensions } = await page.evaluate(async (data) => {
        const { render } = await import("/scripts/diagrams/browser.ts");
        return render(data);
      }, scene);
      const file = source.replace(/\.excalidraw$/, ".svg");
      const destination = new URL(file, output);
      await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
      await writeFile(destination, svg);
      scenes.push({
        source: `/${source}`,
        file,
        sourceHash,
        svgHash: digest(svg),
        ...dimensions,
      });
      console.log(`Generated ${file}`);
    }
    await mkdir(output, { recursive: true });
    await writeFile(
      new URL("manifest.json", output),
      `${JSON.stringify({ generator: await fingerprint(), scenes }, null, 2)}\n`,
    );
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
