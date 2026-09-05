import type { BaseLayoutProps } from "@/components/layout/shared";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/logo";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Logo size={42} />
          caulk.lol
        </>
      ),
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
