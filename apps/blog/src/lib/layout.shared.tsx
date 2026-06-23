import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "caulk.lol",
    },
    links: [
      { text: "archive", url: "/posts" },
      { text: "links", url: "/links" },
      { text: "about", url: "/about" },
    ],
    searchToggle: { enabled: false },
    themeSwitch: {
      component: <ThemeToggle />,
    },
  };
}
