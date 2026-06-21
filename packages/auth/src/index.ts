import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { authSchema, createDb } from "@caulk.lol/db";
import {
  readEnvString,
  requireBinding,
  requireEnvString,
  type RuntimeEnv,
} from "@caulk.lol/env/bindings";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth(runtimeEnv: RuntimeEnv) {
  const db = createDb(runtimeEnv);
  const linksDb = requireBinding(runtimeEnv.LINKS_DB, "LINKS_DB");
  const ownerEmail = readEnvString(runtimeEnv.OWNER_EMAIL);

  return betterAuth({
    baseURL: requireEnvString(runtimeEnv.BETTER_AUTH_URL, "BETTER_AUTH_URL"),
    secret: requireEnvString(runtimeEnv.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      transaction: false,
      camelCase: true,
      schema: authSchema,
    }),
    trustedOrigins: readTrustedOrigins(runtimeEnv),
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (ownerEmail && user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
              return false;
            }

            const userCount = await linksDb
              .prepare('select count(*) as count from "user"')
              .first<{ count: number }>();

            if (!userCount) {
              throw new Error("Could not read owner user count.");
            }

            return userCount.count === 0;
          },
        },
      },
    },
    plugins: [
      apiKey({
        defaultPrefix: "caulk_",
        enableMetadata: true,
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
      }),
      tanstackStartCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Awaited<ReturnType<Auth["api"]["getSession"]>>;

function readTrustedOrigins(runtimeEnv: RuntimeEnv): string[] {
  const origins = readEnvString(runtimeEnv.CORS_ORIGIN);
  if (!origins) return [];

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
