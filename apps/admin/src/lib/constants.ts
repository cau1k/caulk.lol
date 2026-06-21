import type { LucideIcon } from "lucide-react";
import { GaugeIcon, LinkIcon, RadioTowerIcon } from "lucide-react";

export type AdminRoutePath = "/dashboard" | "/links" | "/device";

export type AdminSidebarLink = {
  icon: LucideIcon;
  label: string;
  to: AdminRoutePath;
};

export const adminSidebarLinks = [
  { icon: GaugeIcon, label: "Dashboard", to: "/dashboard" },
  { icon: LinkIcon, label: "Links", to: "/links" },
  { icon: RadioTowerIcon, label: "Device auth", to: "/device" },
] satisfies AdminSidebarLink[];
