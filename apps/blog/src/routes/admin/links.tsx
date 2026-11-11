import { adminUrl } from "@caulk.lol/env/urls";
import { env } from "@caulk.lol/env/web";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/links")({
  beforeLoad: () => {
    throw redirect({ href: adminUrl(env.VITE_SERVER_URL, "/dashboard") });
  },
});
