import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: z.url(),
  },
  runtimeEnv: getImportMetaEnv(),
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});

type ImportMetaWithEnv = ImportMeta & {
  readonly env?: Record<string, string | boolean | undefined>;
};

function getImportMetaEnv(): Record<string, string | boolean | undefined> {
  const meta: ImportMetaWithEnv = import.meta;
  const env = meta.env;
  return env ?? {};
}
