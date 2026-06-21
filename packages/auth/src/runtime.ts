import { getRuntimeEnv } from "@caulk.lol/env/runtime";

import { createAuth } from "./index";

export function getAuth(request?: Request) {
  return createAuth(getRuntimeEnv(request));
}
