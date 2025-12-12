import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { NavSearchButton } from "@/components/nav-search-button";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "caulk.lol",
    },
    links: [
      { text: "archive", url: "/posts" },
      { text: "about", url: "/about" },
    ],
    searchToggle: {
      components: {
        lg: <NavSearchButton />,
        sm: <NavSearchButton className="p-2" />,
      },
    },
  };
}
