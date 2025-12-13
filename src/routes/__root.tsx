import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import * as React from "react";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "caulk.lol",
      },
    ],
    links: [
      {
        rel: "preload",
        href: "/fonts/cmu-serif/cmunbx-webfont.woff",
        as: "font",
        type: "font/woff",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/cmu-serif/cmunrm-webfont.woff",
        as: "font",
        type: "font/woff",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/cmu-sans/cmunss-webfont.woff",
        as: "font",
        type: "font/woff",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script>
          {`(function () {
  try {
    var stored =
      localStorage.getItem('theme') ||
      localStorage.getItem('fumadocs-theme') ||
      localStorage.getItem('fd-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : null;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();`}
        </script>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider search={{ hotKey: [{ key: "/", display: "/" }] }}>
          {children}
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
