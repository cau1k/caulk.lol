import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { type ReactNode, useLayoutEffect } from "react";
import { BackgroundStars } from "@/components/background-stars";
import {
  BackgroundStarsProvider,
  useBackgroundStarsOptional,
} from "@/components/background-stars-context";
import { NotFound } from "@/components/not-found";
import { TerminalFooter } from "@/components/terminal-footer";
import { HomeLayout } from "@/components/layout/home";
import { baseOptions } from "@/lib/layout.shared";
// Keep global and theme CSS in the entry's manifest so both are available in
// the first response, without a late stylesheet fetch during hydration.
import "@/styles/app.css";
import "@/components/layout/theme-toggle.css";

const siteRumScript = `(function () {
  var excluded = { '/analytics': true };
  function report() {
    var pathname = window.location.pathname;
    if (excluded[pathname] || !navigator.sendBeacon) return;
    var entry = performance.getEntriesByType('navigation')[0];
    if (!entry || entry.loadEventEnd <= 0) return;
    navigator.sendBeacon(
      '/api/analytics/rum',
      new Blob([
        JSON.stringify({
          pathname: pathname,
          referrer: document.referrer,
          durationMs: entry.loadEventEnd - entry.startTime,
        }),
      ], { type: 'application/json' }),
    );
  }
  function queueReport() {
    window.setTimeout(report, 0);
  }
  if (document.readyState === 'complete') queueReport();
  else window.addEventListener('load', queueReport, { once: true });
})();`;

export const Route = createRootRoute({
  notFoundComponent: NotFound,
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
        href: "/fonts/cmu-serif/cmunbx-webfont-latin-core.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/cmu-sans/cmunss-webfont-latin-core.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/cmu-sans/cmunsx-webfont-latin-core.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
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

function RootDocument({ children }: { children: ReactNode }) {
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
        <script>{siteRumScript}</script>
        <BackgroundStarsProvider>
          <BackgroundStarsRouteSync />
          <BackgroundStars />
          <RootProvider search={{ enabled: false }}>
            <PublicShell>{children}</PublicShell>
            <TerminalFooter />
          </RootProvider>
        </BackgroundStarsProvider>
        <Scripts />
      </body>
    </html>
  );
}

function PublicShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname.startsWith("/admin/")) return children;

  // The shared header hydrates with the root, independently of lazy page content.
  // Keep the existing outer DOM and the homepage's header/content offset.
  return (
    <HomeLayout
      {...baseOptions({
        subtitle:
          pathname === "/"
            ? "Thoughts on software, philosophy, and hacking on agent harnesses."
            : undefined,
      })}
      className={pathname === "/" ? "pt-24 sm:pt-32" : undefined}
    >
      {children}
    </HomeLayout>
  );
}

function BackgroundStarsRouteSync() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const starsCtx = useBackgroundStarsOptional();
  const shouldPause = pathname.startsWith("/posts/");

  useLayoutEffect(() => {
    starsCtx?.setRoutePaused(shouldPause);
  }, [shouldPause, starsCtx]);

  return null;
}
