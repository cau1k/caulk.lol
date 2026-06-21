import { createAuth } from "@caulk.lol/auth";
import { getRuntimeEnv } from "@caulk.lol/env/runtime";

export { createAuth } from "@caulk.lol/auth";
export type { AuthSession } from "@caulk.lol/auth";

export function getAuth(request?: Request) {
  return createAuth(getRuntimeEnv(request));
}
