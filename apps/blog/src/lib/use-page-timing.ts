"use client";

import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type PageTiming = {
  /** Time for initial page load (TTFB + server response) in ms */
  initialLoad: number | null;
  /** Time for last client-side navigation in ms */
  navigation: number | null;
  /** Whether this is the initial load or a client navigation */
  isInitialLoad: boolean;
};

export function usePageTiming(): PageTiming {
  const router = useRouter();
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  const [timing, setTiming] = useState<PageTiming>({
    initialLoad: null,
    navigation: null,
    isInitialLoad: true,
  });

  const navStartRef = useRef<number>(0);
  const hasNavigatedRef = useRef(false);

  // Measure initial page load using Navigation Timing API
  useEffect(() => {
    const measureInitialLoad = () => {
      const nav = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;

      if (nav) {
        // responseEnd - requestStart gives us server response time (network + SSR)
        const loadTime = Math.round(nav.responseEnd - nav.requestStart);
        setTiming((prev) => ({ ...prev, initialLoad: loadTime }));
      }
    };

    // Wait for load to complete
    if (document.readyState === "complete") {
      measureInitialLoad();
    } else {
      window.addEventListener("load", measureInitialLoad, { once: true });
      return () => window.removeEventListener("load", measureInitialLoad);
    }
  }, []);

  // Track navigation start when loading begins
  useEffect(() => {
    if (isLoading && !navStartRef.current) {
      navStartRef.current = performance.now();
    }
  }, [isLoading]);

  // Subscribe to router events for client-side navigation timing
  useEffect(() => {
    const unsubscribe = router.subscribe("onResolved", () => {
      if (navStartRef.current > 0) {
        const navTime = Math.round(performance.now() - navStartRef.current);
        navStartRef.current = 0;

        // Only update navigation time after first client nav
        if (hasNavigatedRef.current) {
          setTiming((prev) => ({
            ...prev,
            navigation: navTime,
            isInitialLoad: false,
          }));
        } else {
          hasNavigatedRef.current = true;
        }
      }
    });

    return unsubscribe;
  }, [router]);

  return timing;
}
