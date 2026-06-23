import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { lazy, type ReactNode, Suspense, useLayoutEffect } from "react";
import {
  BackgroundStarsProvider,
  useBackgroundStarsOptional,
} from "@/components/background-stars-context";
import { NotFound } from "@/components/not-found";
import appCss from "@/styles/app.css?url";

const BackgroundStars = lazy(() =>
  import("@/components/background-stars").then((module) => ({
    default: module.BackgroundStars,
  })),
);
const TerminalFooter = lazy(() =>
  import("@/components/terminal-footer").then((module) => ({
    default: module.TerminalFooter,
  })),
);

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
        href: "/fonts/cmu-sans/cmunss-webfont-latin.woff",
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
          <Suspense fallback={null}>
            <BackgroundStars />
          </Suspense>
          <RootProvider search={{ enabled: false }}>
            {children}
            <Suspense fallback={null}>
              <TerminalFooter />
            </Suspense>
          </RootProvider>
        </BackgroundStarsProvider>
        <Scripts />
      </body>
    </html>
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
