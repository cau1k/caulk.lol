import { getRuntimeEnv, readEnvString } from "@caulk.lol/env/runtime";
import type { AuthSession } from "@/lib/auth";

export function getOwnerEmail(request?: Request): string | undefined {
  return (
    readEnvString(getRuntimeEnv(request).OWNER_EMAIL) ?? readEnvString(process.env.OWNER_EMAIL)
  );
}

export function isOwnerSession(
  session: AuthSession,
  request?: Request,
): session is NonNullable<AuthSession> {
  if (!session) return false;
  const ownerEmail = getOwnerEmail(request);
  if (!ownerEmail) return true;
  return session.user.email.toLowerCase() === ownerEmail.toLowerCase();
}

export async function getOwnerSession(request: Request): Promise<NonNullable<AuthSession> | null> {
  const auth = await getRequestAuth(request);
  const session = await auth.api.getSession({ headers: request.headers });
  return isOwnerSession(session, request) ? session : null;
}

export async function canWriteLinks(request: Request): Promise<boolean> {
  const session = await getOwnerSession(request);
  if (session) return true;

  const key = getApiKey(request);
  if (!key) return false;

  const auth = await getRequestAuth(request);
  const result = await auth.api.verifyApiKey({
    body: {
      key,
      permissions: {
        links: ["write"],
      },
    },
  });

  return result.valid;
}

async function getRequestAuth(request: Request) {
  const { getAuth } = await import("@/lib/auth");
  return getAuth(request);
}

function getApiKey(request: Request): string | null {
  const direct = request.headers.get("x-api-key");
  if (direct) return direct;

  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
