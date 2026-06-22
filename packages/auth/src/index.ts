import "reflect-metadata";

import { apiKey } from "@better-auth/api-key";
import { APIError } from "@better-auth/core/error";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { authSchema, createDb } from "@caulk.lol/db";
import {
  readEnvString,
  requireBinding,
  requireEnvString,
  type RuntimeEnv,
} from "@caulk.lol/env/bindings";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { deviceAuthorization } from "better-auth/plugins/device-authorization";
import { emailOTP } from "better-auth/plugins/email-otp";

const ADMIN_NAME = "Zero";
const DEVICE_CLIENT_IDS = new Set(["caulk-cli"]);

type AuthUserInput = {
  email: string;
  name?: string | null;
} & Record<string, unknown>;

type AuthSessionInput = {
  userId: string;
} & Record<string, unknown>;

type AuthHookContext = {
  context: {
    internalAdapter: {
      findUserById(userId: string): Promise<{ email: string } | null>;
    };
  };
} | null;

export function createAuth(runtimeEnv: RuntimeEnv) {
  return betterAuth({
    ...createAuthConfig(runtimeEnv),
    plugins: createAuthPlugins(runtimeEnv),
  });
}

export function createAuthConfig(runtimeEnv: RuntimeEnv) {
  const db = createDb(runtimeEnv);
  const ownerEmail = normalizeEmail(requireEnvString(runtimeEnv.OWNER_EMAIL, "OWNER_EMAIL"));

  return {
    baseURL: requireEnvString(runtimeEnv.BETTER_AUTH_URL, "BETTER_AUTH_URL"),
    secret: requireEnvString(runtimeEnv.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      transaction: false,
      camelCase: true,
      schema: authSchema,
    }),
    trustedOrigins: readTrustedOrigins(runtimeEnv),
    databaseHooks: {
      session: {
        create: {
          before: async (session: AuthSessionInput, context: AuthHookContext) => {
            const user = await context?.context.internalAdapter.findUserById(session.userId);
            if (!user || !isOwnerEmail(user.email, ownerEmail)) {
              throw ownerOnlyError();
            }
          },
        },
      },
      user: {
        create: {
          before: async (user: AuthUserInput) => {
            if (!isOwnerEmail(user.email, ownerEmail)) {
              throw ownerOnlyError();
            }

            return {
              data: {
                ...user,
                email: normalizeEmail(user.email),
                emailVerified: true,
                name: user.name || ADMIN_NAME,
                role: "admin",
              },
            };
          },
        },
      },
    },
  };
}

export function createAuthPlugins(runtimeEnv: RuntimeEnv) {
  const ownerEmail = normalizeEmail(requireEnvString(runtimeEnv.OWNER_EMAIL, "OWNER_EMAIL"));

  return [
    admin({ defaultRole: "admin" }),
    passkey({
      origin: getAdminOrigin(runtimeEnv),
      rpID: getPasskeyRpId(runtimeEnv),
      rpName: "caulk.lol",
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (!isOwnerEmail(email, ownerEmail)) return;
        await sendOwnerOtp({ runtimeEnv, ownerEmail, otp, type });
      },
    }),
    createApiKeyPlugin(),
    deviceAuthorization({
      schema: {},
      validateClient: (clientId) => DEVICE_CLIENT_IDS.has(clientId),
      verificationUri: getDeviceVerificationUri(runtimeEnv),
    }),
    bearer(),
  ];
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export function createApiKeyPlugin() {
  return apiKey({
    defaultPrefix: "caulk_",
    enableMetadata: true,
    enableSessionForAPIKeys: true,
    permissions: {
      defaultPermissions: {
        links: ["write"],
      },
    },
    rateLimit: {
      enabled: true,
      maxRequests: 240,
      timeWindow: 1000 * 60 * 60 * 24,
    },
  });
}

function readTrustedOrigins(runtimeEnv: RuntimeEnv): string[] {
  const origins = readEnvString(runtimeEnv.CORS_ORIGIN);
  if (!origins) return [];

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function sendOwnerOtp({
  runtimeEnv,
  ownerEmail,
  otp,
  type,
}: {
  runtimeEnv: RuntimeEnv;
  ownerEmail: string;
  otp: string;
  type: string;
}) {
  const emailFrom = normalizeEmail(requireEnvString(runtimeEnv.AUTH_EMAIL_FROM, "AUTH_EMAIL_FROM"));

  await requireBinding(runtimeEnv.EMAIL, "EMAIL").send({
    from: emailFrom,
    to: ownerEmail,
    subject: `Your sign-in code is: ${otp}`,
    text: [
      `Your caulk.lol ${type} code is ${otp}.`,
      "",
      "This code expires soon. If you did not request it, ignore this email.",
    ].join("\n"),
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isOwnerEmail(email: string, ownerEmail: string) {
  return normalizeEmail(email) === ownerEmail;
}

function ownerOnlyError() {
  return new APIError("FORBIDDEN", {
    message: "This site only accepts the caulk.lol owner.",
  });
}

function getDeviceVerificationUri(runtimeEnv: RuntimeEnv) {
  return `${getAdminOrigin(runtimeEnv)}/device`;
}

function getAdminOrigin(runtimeEnv: RuntimeEnv) {
  const adminOrigin = readTrustedOrigins(runtimeEnv).find((origin) => {
    try {
      return new URL(origin).hostname.startsWith("admin.");
    } catch {
      return false;
    }
  });

  if (adminOrigin) return adminOrigin;
  if (isDevelopmentEnvironment(runtimeEnv)) return "http://localhost:3002";
  return "https://admin.caulk.lol";
}

function getPasskeyRpId(runtimeEnv: RuntimeEnv) {
  const hostname = getOriginHostname(getAdminOrigin(runtimeEnv));

  if (isLocalHostname(hostname)) return "localhost";
  if (hostname === "caulk.lol" || hostname.endsWith(".caulk.lol")) return "caulk.lol";
  return hostname;
}

function isDevelopmentEnvironment(runtimeEnv: RuntimeEnv) {
  return [readEnvString(runtimeEnv.BETTER_AUTH_URL), ...readTrustedOrigins(runtimeEnv)].some(
    (origin) => origin !== undefined && isLocalOrigin(origin),
  );
}

function isLocalOrigin(value: string) {
  try {
    const { hostname } = new URL(value);
    return isLocalHostname(hostname);
  } catch {
    return false;
  }
}

function getOriginHostname(value: string) {
  return new URL(value).hostname;
}

function isLocalHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}
