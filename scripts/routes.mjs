import { createRequire } from "node:module";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// TanStack generates routes in its Vite configResolved hook, including Start's
// Register footer. Resolve the app's actual build config before tsc so a fresh
// checkout has the same route types as a built app. No server or build starts.
// Resolve Vite from the calling app, where it is a declared dependency.
const { resolveConfig } = await import(
  pathToFileURL(createRequire(resolve("package.json")).resolve("vite")).href
);
// The router generator logs caught errors instead of rethrowing. Fail this
// command on those errors, even if an older generated file already exists.
let failed = false;
const reportError = console.error;
console.error = (...args) => {
  failed = true;
  reportError(...args);
};
try {
  await resolveConfig({}, "build");
} finally {
  console.error = reportError;
}
if (failed) throw new Error("Route generation failed; see the errors above.");
await access(resolve("src/routeTree.gen.ts"));
