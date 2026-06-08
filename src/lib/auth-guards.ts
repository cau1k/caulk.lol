import { type AuthSession, auth } from "@/lib/auth";
import { getAppEnv, readEnvString } from "@/lib/worker-env";

export function getOwnerEmail(): string | undefined {
  return (
    readEnvString(getAppEnv().OWNER_EMAIL) ??
    readEnvString(process.env.OWNER_EMAIL)
  );
}

export function isOwnerSession(
  session: AuthSession,
): session is NonNullable<AuthSession> {
  if (!session) return false;
  const ownerEmail = getOwnerEmail();
  if (!ownerEmail) return true;
  return session.user.email.toLowerCase() === ownerEmail.toLowerCase();
}

export async function getOwnerSession(
  request: Request,
): Promise<NonNullable<AuthSession> | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return isOwnerSession(session) ? session : null;
}

export async function canWriteLinks(request: Request): Promise<boolean> {
  const session = await getOwnerSession(request);
  if (session) return true;

  const key = getApiKey(request);
  if (!key) return false;

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

function getApiKey(request: Request): string | null {
  const direct = request.headers.get("x-api-key");
  if (direct) return direct;

  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}
