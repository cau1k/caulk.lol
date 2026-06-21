import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import path from "node:path";

import { z } from "zod";

const configSchema = z.object({
  serverUrl: z.string().url().default("https://api.caulk.lol"),
});

const bearerAuthSchema = z.object({
  kind: z.literal("bearer"),
  token: z.string().min(1),
});

const apiKeyAuthSchema = z.object({
  key: z.string().min(1),
  kind: z.literal("api-key"),
});

export const authSchema = z.discriminatedUnion("kind", [bearerAuthSchema, apiKeyAuthSchema]);

export type CliAuth = z.infer<typeof authSchema>;
export type CliConfig = z.infer<typeof configSchema>;

export function configDir() {
  if (process.env.CAULK_CONFIG_DIR) return process.env.CAULK_CONFIG_DIR;
  if (platform() === "darwin") {
    return path.join(homedir(), "Library", "Application Support", "caulk");
  }
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config"), "caulk");
}

export function configPath() {
  return path.join(configDir(), "config.json");
}

export function authPath() {
  return path.join(configDir(), "auth.json");
}

export async function readConfig() {
  const fileConfig = configSchema.parse(await readJson(configPath(), {}));
  const serverUrl = process.env.CAULK_SERVER_URL;
  if (serverUrl && serverUrl.trim().length > 0) {
    return configSchema.parse({ ...fileConfig, serverUrl: serverUrl.trim() });
  }
  return fileConfig;
}

export async function writeConfig(config: CliConfig) {
  await writeJson(configPath(), configSchema.parse(config));
}

export async function readAuth() {
  return authSchema.nullable().parse(await readJson(authPath(), null));
}

export async function writeAuth(auth: CliAuth) {
  await writeJson(authPath(), authSchema.parse(auth));
}

async function readJson(filePath: string, fallback: unknown) {
  try {
    const text = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch (error) {
    if (hasNodeErrorCode(error, "ENOENT")) return fallback;
    throw error;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function hasNodeErrorCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}
