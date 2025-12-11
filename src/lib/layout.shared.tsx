import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Caulk",
    },
    links: [
      { text: "Blog", url: "/blog" },
      { text: "Docs", url: "/docs" },
    ],
  };
}
