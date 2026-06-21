import { Button } from "@caulk.lol/ui/components/button";
import { Link } from "@tanstack/react-router";
import { CommandIcon, GaugeIcon, RadioTowerIcon } from "lucide-react";

import UserMenu from "./user-menu";

const links = [
  { icon: <GaugeIcon className="size-3.5" />, label: "Dashboard", to: "/dashboard" },
  { icon: <RadioTowerIcon className="size-3.5" />, label: "Device", to: "/device" },
];

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-12 items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-5">
          <Link to="/dashboard" className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase">
            <span className="inline-flex size-7 items-center justify-center border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <CommandIcon className="size-3.5" />
            </span>
            caulk
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link key={link.to} to={link.to} activeOptions={{ exact: true }}>
                {({ isActive }) => (
                  <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                    {link.icon}
                    {link.label}
                  </Button>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
