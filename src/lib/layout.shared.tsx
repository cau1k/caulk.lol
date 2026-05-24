import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NavSearchButton } from "@/components/nav-search-button";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "caulk.lol",
    },
    links: [
      { text: "archive", url: "/posts" },
      { text: "notes", url: "/notes" },
      { text: "projects", url: "/projects" },
      { text: "about", url: "/about" },
    ],
    searchToggle: {
      components: {
        lg: <NavSearchButton />,
        sm: <NavSearchButton />,
      },
    },
    themeSwitch: {
      component: <ThemeToggle />,
    },
  };
}
