import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { env } from "@caulk.lol/env/web";
import { deviceAuthorizationClient, emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [emailOTPClient(), passkeyClient(), apiKeyClient(), deviceAuthorizationClient()],
});
