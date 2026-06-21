import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@caulk.lol/ui/components/sidebar";
import { Link, Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { SquareTerminalIcon } from "lucide-react";

import { SettingsDialog } from "@/components/settings-dialog";
import UserMenu from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";
import { adminSidebarLinks } from "@/lib/constants";

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
  const { session } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const sessionData = session.data;

  if (!sessionData) throw new Error("Missing admin session.");

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/dashboard" />} tooltip="caulk.lol">
                <SquareTerminalIcon />
                <span>caulk.lol</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminSidebarLinks.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={pathname === item.to}
                      render={<Link to={item.to} />}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SettingsDialog
                ownerEmail={sessionData.user.email}
                trigger={<SidebarMenuButton tooltip="Settings" />}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <UserMenu />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

function hasAdminRole(user: unknown) {
  if (typeof user !== "object" || user === null) return false;
  if (!("role" in user) || typeof user.role !== "string") return false;
  return user.role.split(",").includes("admin");
}
