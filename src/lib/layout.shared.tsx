import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "caulk.lol",
    },
    links: [
      { text: "archive", url: "/posts" },
      { text: "about", url: "/about" },
    ],
  };
}
