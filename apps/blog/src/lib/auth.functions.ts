import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { isOwnerSession } from "@/lib/auth-guards";

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const { getAuth } = await import("@/lib/auth");
  const session = await getAuth().api.getSession({ headers });
  return isOwnerSession(session) ? session : null;
});
