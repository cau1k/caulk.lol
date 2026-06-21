import { createContext } from "@caulk.lol/api/context";
import { appRouter } from "@caulk.lol/api/routers/index";
import { createAuth } from "@caulk.lol/auth";
import { requireEnvString, type CloudflareEnv } from "@caulk.lol/env/bindings";
import { trpcServer } from "@hono/trpc-server";
import { initLogger } from "evlog";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

initLogger({
  env: { service: "caulk.lol-server" },
});

type ServerEnv = EvlogVariables & {
  Bindings: CloudflareEnv;
};

const app = new Hono<ServerEnv>();

app.use(evlog());

app.use("/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: parseCorsOrigins(requireEnvString(c.env.CORS_ORIGIN, "CORS_ORIGIN")),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => createContext({ context }),
  }),
);

app.get("/", (c) => c.text("OK"));

export default app;

function parseCorsOrigins(value: string): string | string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGIN must include at least one origin.");
  }

  if (origins.length === 1) {
    const [origin] = origins;
    if (origin) return origin;
  }

  return origins;
}
