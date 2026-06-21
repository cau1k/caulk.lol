import { requireBinding, type RuntimeEnv } from "@caulk.lol/env/bindings";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export function createDb(runtimeEnv: RuntimeEnv) {
  const linksDb = requireBinding(runtimeEnv.LINKS_DB, "LINKS_DB");
  return drizzle(linksDb, { schema });
}

export { schema };
export * from "./schema";
