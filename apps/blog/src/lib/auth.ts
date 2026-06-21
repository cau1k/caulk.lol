import { getRuntimeEnv } from "@caulk.lol/env/runtime";
import { createTanstackAuth } from "@caulk.lol/auth/tanstack";

export { createTanstackAuth as createAuth } from "@caulk.lol/auth/tanstack";
export type { AuthSession } from "@caulk.lol/auth";

export function getAuth(request?: Request) {
  return createTanstackAuth(getRuntimeEnv(request));
}
