import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "@/lib/auth";
import { isOwnerSession } from "@/lib/auth-guards";

export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await getAuth().api.getSession({ headers });
    return isOwnerSession(session) ? session : null;
  },
);
