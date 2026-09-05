import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const blog = new URL("../../", import.meta.url);
export const output = new URL("src/generated/diagrams/", blog);
export const digest = (data) => createHash("sha256").update(data).digest("hex");

export async function sourceFiles() {
  return (await readdir(new URL("public/", blog), { recursive: true }))
    .filter((file) => file.endsWith(".excalidraw"))
    .sort();
}

/** Source transforms and exporter updates invalidate the checked-in drawings. */
export async function fingerprint() {
  const exporter = pathToFileURL(createRequire(import.meta.url).resolve("@excalidraw/excalidraw"));
  const { version } = JSON.parse(await readFile(new URL("../../package.json", exporter), "utf8"));
  const inputs = await Promise.all(
    ["files.mjs", "generate.mjs", "browser.ts", "styles.ts"].map((file) =>
      readFile(new URL(file, import.meta.url), "utf8"),
    ),
  );
  return digest(JSON.stringify([version, ...inputs]));
}
