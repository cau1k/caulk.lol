import { spawnSync } from "node:child_process";

const env = { ...process.env };

for (const key of Object.keys(env)) {
  if (key === "NODE" || key.startsWith("npm_") || key.startsWith("PNPM_")) {
    delete env[key];
  }
}

const result = spawnSync("./node_modules/.bin/oxlint", ["--threads=1"], {
  encoding: "utf8",
  env,
  maxBuffer: 1024 * 1024 * 16,
});

if (result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}

if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
