import { z } from "zod";

import type { CliAuth } from "./config";
import { readAuth, readConfig } from "./config";
import { CliError } from "./io";

const errorResponseSchema = z.object({
  error: z.string(),
});

export async function apiRequest<Output>({
  auth,
  init = {},
  path,
  schema,
}: {
  auth?: CliAuth | null;
  init?: RequestInit;
  path: string;
  schema: z.ZodType<Output>;
}): Promise<Output> {
  const config = await readConfig();
  const cliAuth = auth === undefined ? await readAuth() : auth;
  const url = new URL(path, config.serverUrl);
  const headers = new Headers(init.headers);
  headers.set("user-agent", "caulk CLI");

  const authHeader = authHeaders(cliAuth);
  if (authHeader) headers.set(authHeader.name, authHeader.value);

  const response = await fetch(url, {
    ...init,
    headers,
  });
  const json = await readJson(response);

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(json);
    if (parsed.success) throw new CliError(parsed.data.error);
    throw new CliError(`Request failed with ${response.status}.`);
  }

  return schema.parse(json);
}

function authHeaders(auth: CliAuth | null) {
  if (!auth) return null;
  if (auth.kind === "bearer") {
    return { name: "authorization", value: `Bearer ${auth.token}` };
  }
  return { name: "x-api-key", value: auth.key };
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new CliError(`Expected JSON response from API, got ${response.status}.`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new CliError(
      error instanceof Error ? `Invalid JSON response: ${error.message}` : "Invalid JSON response.",
    );
  }
}
