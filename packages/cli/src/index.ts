#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

import {
  type CreateLinkInput,
  linkResponseSchema,
  linksResponseSchema,
  linkStatusSchema,
  createLinkInputSchema,
} from "@caulk.lol/api/links";
import { defineCommand, runMain } from "citty";
import { z } from "zod";

import { authPath, configPath, readConfig, writeAuth, writeConfig, type CliAuth } from "./config";
import { apiRequest } from "./http";
import { CliError, printError } from "./io";

const DEVICE_CLIENT_ID = "caulk-cli";
const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

const adminMeResponseSchema = z.object({
  user: z.object({
    email: z.string(),
    id: z.string(),
    name: z.string().nullable().optional(),
  }),
});

const deviceCodeResponseSchema = z.object({
  device_code: z.string(),
  expires_in: z.number(),
  interval: z.number(),
  user_code: z.string(),
  verification_uri_complete: z.string().url(),
});

const deviceTokenResponseSchema = z.object({
  access_token: z.string(),
});

const deviceTokenErrorSchema = z.object({
  error: z.enum([
    "authorization_pending",
    "slow_down",
    "expired_token",
    "access_denied",
    "invalid_request",
    "invalid_grant",
  ]),
  error_description: z.string(),
});

const linksList = defineCommand({
  meta: { description: "List caulk.lol links." },
  args: {
    all: {
      alias: "a",
      description: "Include draft and archived links. Requires auth.",
      required: false,
      type: "boolean",
    },
    json: {
      description: "Print JSON.",
      required: false,
      type: "boolean",
    },
  },
  async run({ args }) {
    const path = args.all ? "/api/links?include=archived" : "/api/links";
    const payload = await apiRequest({ path, schema: linksResponseSchema });
    if (args.json) {
      console.log(JSON.stringify(payload.links, null, 2));
      return;
    }
    for (const link of payload.links) {
      console.log(`${link.status.padEnd(9)} ${link.id} ${link.title}`);
      console.log(`          ${link.url}`);
    }
  },
});

const linksAdd = defineCommand({
  meta: { description: "Add a link to caulk.lol." },
  args: {
    description: {
      alias: "d",
      description: "Optional description override.",
      required: false,
      type: "string",
    },
    reason: {
      alias: "r",
      description: "Why this link is worth saving.",
      required: true,
      type: "string",
    },
    status: {
      alias: "s",
      description: "draft or published.",
      required: false,
      type: "string",
    },
    tags: {
      alias: "t",
      description: "Comma-separated tags.",
      required: false,
      type: "string",
    },
    title: {
      description: "Optional title override.",
      required: false,
      type: "string",
    },
    url: {
      alias: "u",
      description: "URL to save.",
      required: true,
      type: "string",
    },
  },
  async run({ args }) {
    const input = parseOrPrint(
      createLinkInputSchema.safeParse({
        description: args.description,
        reason: args.reason,
        source: "cli",
        status: args.status ?? "published",
        tags: splitTags(args.tags ?? ""),
        title: args.title,
        url: args.url,
      }),
    );
    if (!input) return;
    const link = await createLink(input);
    console.log(`created ${link.id}`);
    console.log(link.url);
  },
});

const linksArchive = defineCommand({
  meta: { description: "Archive a link." },
  args: {
    id: {
      description: "Link id.",
      required: true,
      type: "positional",
    },
  },
  async run({ args }) {
    const link = await updateLinkStatus(args.id, "archived");
    console.log(`archived ${link.id}`);
  },
});

const linksPublish = defineCommand({
  meta: { description: "Publish a link." },
  args: {
    id: {
      description: "Link id.",
      required: true,
      type: "positional",
    },
  },
  async run({ args }) {
    const link = await updateLinkStatus(args.id, "published");
    console.log(`published ${link.id}`);
  },
});

const links = defineCommand({
  meta: { description: "Good links commands." },
  subCommands: {
    add: linksAdd,
    archive: linksArchive,
    list: linksList,
    publish: linksPublish,
  },
});

const authStatus = defineCommand({
  meta: { description: "Show authenticated admin account." },
  async run() {
    const me = await getMe();
    console.log(`${me.user.email} (${me.user.id})`);
  },
});

const authLogin = defineCommand({
  meta: { description: "Store CLI auth using device authorization or an API key." },
  args: {
    "api-key": {
      description: "Store an API key. Omit the value to prompt securely.",
      required: false,
      type: "string",
    },
    "device-auth": {
      description: "Sign in using Better Auth device authorization.",
      required: false,
      type: "boolean",
    },
    "no-open": {
      description: "Do not try to open the verification URL in a browser.",
      required: false,
      type: "boolean",
    },
  },
  async run({ args }) {
    if (!args["device-auth"] && args["api-key"] === undefined) {
      printCliError("Choose one login mode: auth login --device-auth or auth login --api-key [key].", 2);
      return;
    }
    if (args["device-auth"] && args["api-key"] !== undefined) {
      printCliError("Use only one of --device-auth or --api-key.", 2);
      return;
    }

    if (args["api-key"] !== undefined) {
      if (args["no-open"]) {
        printCliError("--no-open only applies to --device-auth.", 2);
        return;
      }
      if (!args["api-key"] && !(process.stdin.isTTY && process.stdin.setRawMode)) {
        printCliError("Pass --api-key <key> when stdin is not interactive.", 2);
        return;
      }
      const auth: CliAuth = {
        key: args["api-key"] || (await promptSecret("API key: ")),
        kind: "api-key",
      };
      await getMe(auth);
      await writeAuth(auth);
      console.log(`stored api-key auth at ${authPath()}`);
      return;
    }

    const config = await readConfig();
    const device = await requestDeviceCode(config.serverUrl);
    console.log("Authorize this CLI:");
    console.log(`  ${device.verification_uri_complete}`);
    console.log(`Code: ${device.user_code}`);
    if (!args["no-open"]) openBrowser(device.verification_uri_complete);
    console.log("Waiting for approval...");
    const token = await pollDeviceToken({
      deviceCode: device.device_code,
      expiresIn: device.expires_in,
      interval: device.interval,
      serverUrl: config.serverUrl,
    });
    const auth: CliAuth = { kind: "bearer", token };
    await getMe(auth);
    await writeAuth(auth);
    console.log(`stored bearer auth at ${authPath()}`);
  },
});

const auth = defineCommand({
  meta: { description: "Authentication commands." },
  subCommands: {
    login: authLogin,
    status: authStatus,
  },
});

const configSet = defineCommand({
  meta: { description: "Set CLI config." },
  args: {
    "server-url": {
      description: "API server URL.",
      required: true,
      type: "string",
    },
  },
  async run({ args }) {
    await writeConfig({ serverUrl: args["server-url"] });
    console.log(`wrote ${configPath()}`);
  },
});

const configGet = defineCommand({
  meta: { description: "Print CLI config." },
  async run() {
    console.log(JSON.stringify(await readConfig(), null, 2));
  },
});

const config = defineCommand({
  meta: { description: "Config commands." },
  subCommands: {
    get: configGet,
    set: configSet,
  },
});

const main = defineCommand({
  meta: {
    description: "caulk.lol operator CLI.",
    name: "caulk",
    version: "0.0.0",
  },
  subCommands: {
    auth,
    config,
    links,
  },
});

async function createLink(input: CreateLinkInput) {
  const payload = await apiRequest({
    init: {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
    path: "/api/links",
    schema: linkResponseSchema,
  });
  return payload.link;
}

async function updateLinkStatus(id: string, statusValue: string) {
  const status = parseOrPrint(linkStatusSchema.safeParse(statusValue));
  if (!status) throw new CliError("Invalid link status.", 2);

  const payload = await apiRequest({
    init: {
      body: JSON.stringify({ status }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    },
    path: `/api/links/${id}`,
    schema: linkResponseSchema,
  });
  return payload.link;
}

async function getMe(auth?: CliAuth) {
  return await apiRequest({
    auth,
    path: "/api/admin/me",
    schema: adminMeResponseSchema,
  });
}

async function requestDeviceCode(serverUrl: string) {
  const response = await fetch(new URL("/api/auth/device/code", serverUrl), {
    body: JSON.stringify({
      client_id: DEVICE_CLIENT_ID,
      scope: "links:write",
    }),
    headers: {
      "content-type": "application/json",
      "user-agent": "caulk CLI",
    },
    method: "POST",
  });
  return deviceCodeResponseSchema.parse(await readAuthResponse(response));
}

async function pollDeviceToken({
  deviceCode,
  expiresIn,
  interval,
  serverUrl,
}: {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  serverUrl: string;
}) {
  return await pollDeviceTokenOnce({
    deviceCode,
    expiresAt: Date.now() + expiresIn * 1000,
    pollingInterval: interval,
    serverUrl,
  });
}

async function pollDeviceTokenOnce({
  deviceCode,
  expiresAt,
  pollingInterval,
  serverUrl,
}: {
  deviceCode: string;
  expiresAt: number;
  pollingInterval: number;
  serverUrl: string;
}): Promise<string> {
  if (Date.now() >= expiresAt) {
    throw new CliError("Device authorization expired. Run auth login again.");
  }
  await sleep(pollingInterval * 1000);
  const response = await fetch(new URL("/api/auth/device/token", serverUrl), {
    body: JSON.stringify({
      client_id: DEVICE_CLIENT_ID,
      device_code: deviceCode,
      grant_type: DEVICE_GRANT_TYPE,
    }),
    headers: {
      "content-type": "application/json",
      "user-agent": "caulk CLI",
    },
    method: "POST",
  });
  const body = await readAuthResponse(response);
  if (response.ok) return deviceTokenResponseSchema.parse(body).access_token;

  const error = deviceTokenErrorSchema.parse(body);
  if (error.error === "authorization_pending") {
    return await pollDeviceTokenOnce({
      deviceCode,
      expiresAt,
      pollingInterval,
      serverUrl,
    });
  }
  if (error.error === "slow_down") {
    return await pollDeviceTokenOnce({
      deviceCode,
      expiresAt,
      pollingInterval: pollingInterval + 5,
      serverUrl,
    });
  }
  throw new CliError(error.error_description);
}

async function readAuthResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new CliError(`Expected JSON auth response, got ${response.status}.`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new CliError(
      error instanceof Error ? `Invalid auth JSON response: ${error.message}` : "Invalid auth JSON response.",
    );
  }
}

function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function promptSecret(label: string) {
  if (!(process.stdin.isTTY && process.stdin.setRawMode)) {
    throw new CliError("Pass --api-key <key> when stdin is not interactive.", 2);
  }
  process.stderr.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return await new Promise<string>((resolve, reject) => {
    let secret = "";

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
    }

    function onData(chunk: Buffer) {
      const input = chunk.toString("utf-8");
      if (input === "\u0003") {
        cleanup();
        process.stderr.write("\n");
        reject(new CliError("Cancelled.", 130));
        return;
      }
      if (input === "\r" || input === "\n") {
        cleanup();
        process.stderr.write("\n");
        resolve(secret.trim());
        return;
      }
      if (input === "\u007F") {
        secret = secret.slice(0, -1);
        return;
      }
      secret += input;
    }

    process.stdin.on("data", onData);
  });
}

function parseOrPrint<T>(result: z.ZodSafeParseResult<T>) {
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join(".") || "input"}: ${issue.message}`);
  }
  process.exitCode = 2;
  return null;
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function printCliError(message: string, exitCode = 1) {
  console.error(message);
  process.exitCode = exitCode;
}

try {
  await runMain(main);
} catch (error) {
  printError(error);
}
