"use client";

import { useEffect } from "react";

const RUM_ENDPOINT = "/api/analytics/rum";
const EXCLUDED_PATHS = new Set(["/analytics"]);

export function SiteRum() {
  useEffect(() => {
    const pathname = window.location.pathname;
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
      const timeoutId = window.setTimeout(report, 0);
      return () => window.clearTimeout(timeoutId);
    }

    window.addEventListener("load", report, { once: true });
    return () => window.removeEventListener("load", report);
  }, []);

  return null;
}
