import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
  ssr: false,
  component: AuthLayout,
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!hasAdminRole(session.data?.user)) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
    return { session };
  },
});

function AuthLayout() {
  return <Outlet />;
}

function hasAdminRole(user: unknown) {
  if (typeof user !== "object" || user === null) return false;
  if (!("role" in user) || typeof user.role !== "string") return false;
  return user.role.split(",").includes("admin");
}
