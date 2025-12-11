import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Caulk",
    },
    links: [{ text: "Writing", url: "/posts" }],
  };
}
