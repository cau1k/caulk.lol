import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/links")({
  beforeLoad: () => {
    throw redirect({ href: "https://admin.caulk.lol/dashboard" });
  },
});
