import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import { authSchema } from "@/lib/auth-schema";
import { getAppEnv, readEnvString } from "@/lib/worker-env";

const importedEnv = getAppEnv();
const authDb = drizzle(importedEnv.LINKS_DB as D1Database, {
  schema: authSchema,
});

export const auth = betterAuth({
  baseURL:
    readEnvString(process.env.BETTER_AUTH_URL) ??
    (import.meta.env.DEV ? "http://localhost:3000" : "https://caulk.lol"),
  secret:
    readEnvString(importedEnv.BETTER_AUTH_SECRET) ??
    readEnvString(process.env.BETTER_AUTH_SECRET) ??
    "development-secret-change-me",
  database: drizzleAdapter(authDb, {
    provider: "sqlite",
    transaction: false,
    camelCase: true,
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const ownerEmail = readEnvString(importedEnv.OWNER_EMAIL);
          if (
            ownerEmail &&
            user.email.toLowerCase() !== ownerEmail.toLowerCase()
          ) {
            return false;
          }

          const userCount = await importedEnv.LINKS_DB?.prepare(
            'select count(*) as count from "user"',
          ).first<{ count: number }>();

          return (userCount?.count ?? 0) === 0;
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

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
