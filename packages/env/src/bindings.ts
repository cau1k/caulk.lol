import type { CloudflareEnv as BoundCloudflareEnv } from "../env";

export type CloudflareEnv = BoundCloudflareEnv;
export type RuntimeEnv = Partial<CloudflareEnv>;

export class MissingRuntimeBindingError extends Error {
  constructor(name: string) {
    super(`${name} binding is unavailable.`);
    this.name = "MissingRuntimeBindingError";
  }
}

export function requireBinding<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null) {
    throw new MissingRuntimeBindingError(name);
  }

  return value;
}

export function readEnvString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function requireEnvString(value: unknown, name: string): string {
  const parsed = readEnvString(value);
  if (!parsed) throw new MissingRuntimeBindingError(name);
  return parsed;
}
