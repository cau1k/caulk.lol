import {
  type CreateLinkInput,
  type GoodLink,
  type UpdateLinkInput,
  linkResponseSchema,
  linksResponseSchema,
} from "@caulk.lol/api/links";
import { env } from "@caulk.lol/env/web";
import { z } from "zod";

const errorResponseSchema = z.object({
  error: z.string(),
});

const apiKeyResponseSchema = z.object({
  apiKey: z.string().min(1),
});

const deviceStatusResponseSchema = z.object({
  user_code: z.string(),
  status: z.enum(["pending", "approved", "denied"]),
});

const successResponseSchema = z.object({
  success: z.boolean(),
});

export type DeviceStatus = z.infer<typeof deviceStatusResponseSchema>;

export class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

export async function listAdminLinks(): Promise<GoodLink[]> {
  const url = apiUrl("/api/links");
  url.searchParams.set("include", "archived");
  const payload = await requestJson(url, {}, linksResponseSchema);
  return payload.links;
}

export async function createAdminLink(input: CreateLinkInput): Promise<GoodLink> {
  const payload = await requestJson(
    apiUrl("/api/links"),
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    linkResponseSchema,
  );
  return payload.link;
}

export async function updateAdminLink(id: string, input: UpdateLinkInput): Promise<GoodLink> {
  const payload = await requestJson(
    apiUrl(`/api/links/${id}`),
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    },
    linkResponseSchema,
  );
  return payload.link;
}

export async function createAdminApiKey(name: string): Promise<string> {
  const payload = await requestJson(
    apiUrl("/api/admin/api-key"),
    {
      body: JSON.stringify({ name }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    apiKeyResponseSchema,
  );
  return payload.apiKey;
}

export async function verifyDeviceCode(userCode: string): Promise<DeviceStatus> {
  const url = apiUrl("/api/auth/device");
  url.searchParams.set("user_code", userCode);
  return await requestJson(url, {}, deviceStatusResponseSchema);
}

export async function approveDeviceCode(userCode: string): Promise<void> {
  await requestJson(
    apiUrl("/api/auth/device/approve"),
    {
      body: JSON.stringify({ userCode }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    successResponseSchema,
  );
}

export async function denyDeviceCode(userCode: string): Promise<void> {
  await requestJson(
    apiUrl("/api/auth/device/deny"),
    {
      body: JSON.stringify({ userCode }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    successResponseSchema,
  );
}

async function requestJson<Output>(
  url: URL,
  init: RequestInit,
  schema: z.ZodType<Output>,
): Promise<Output> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
  });
  const json = await readJson(response);

  if (!response.ok) {
    const error = errorResponseSchema.safeParse(json);
    if (error.success) throw new AdminApiError(error.data.error, response.status);
    throw new AdminApiError(`Request failed with ${response.status}.`, response.status);
  }

  return schema.parse(json);
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new AdminApiError("Expected a JSON response from the admin API.", response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new AdminApiError(
      error instanceof Error ? `Invalid JSON response: ${error.message}` : "Invalid JSON response.",
      response.status,
    );
  }
}

function apiUrl(path: string): URL {
  return new URL(path, env.VITE_SERVER_URL);
}
