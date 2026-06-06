"use client";

import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

const RUM_ENDPOINT = "/api/analytics/rum";
const EXCLUDED_PATHS = new Set(["/analytics"]);

export function SiteRum() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    const initialPathname = window.location.pathname;
    if (pathname !== initialPathname) return;
    if (EXCLUDED_PATHS.has(pathname)) return;

    const report = () => {
      const entry = performance.getEntriesByType("navigation")[0];
      if (!(entry instanceof PerformanceNavigationTiming)) return;

      const durationMs =
        entry.loadEventEnd > 0 ? entry.loadEventEnd - entry.startTime : 0;
      if (durationMs <= 0) return;

      const body = JSON.stringify({
        pathname,
        referrer: document.referrer,
        durationMs,
      });

      navigator.sendBeacon(
        RUM_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
    };

    if (document.readyState === "complete") {
      window.setTimeout(report, 0);
      return;
    }

    window.addEventListener("load", report, { once: true });
    return () => window.removeEventListener("load", report);
  }, [pathname]);

  return null;
}
