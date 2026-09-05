"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePageTiming } from "@/lib/use-page-timing";

const NAV_LINKS = [
  { label: "posts", href: "/posts" as const },
  { label: "about", href: "/about" as const },
] as const;

const SOCIAL_LINKS = [
  { label: "twitter", href: "https://x.com/zerocaulk" },
  { label: "github", href: "https://github.com/cau1k" },
] as const;

export function TerminalFooter() {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const timing = usePageTiming();
  const reveal = `transition-[opacity,transform] duration-300 ease-out ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`;

  // This once-only reveal needs no animation runtime. Match the existing
  // viewport margin, duration, displacement, and stagger with native CSS.
  useEffect(() => {
    const footer = ref.current;
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsInView(true);
        observer.disconnect();
      },
      { rootMargin: "-20px" },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={ref} className="mt-auto">
      <div className="max-w-2xl mx-auto px-4 py-24">
        <div className="font-mono text-sm">
          {/* Main grid */}
          <div className="flex justify-between">
            {/* Nav column */}
            <div className={reveal}>
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-4">nav</div>
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-foreground/70 hover:text-foreground transition-colors duration-150 inline-flex items-center gap-2 group"
                    >
                      <span className="text-muted-foreground group-hover:text-primary transition-colors duration-150">
                        &gt;
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social column */}
            <div className={reveal} style={{ transitionDelay: "50ms" }}>
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-4">
                social
              </div>
              <ul className="space-y-2">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/70 hover:text-foreground transition-colors duration-150 inline-flex items-center gap-2 group"
                    >
                      <span className="text-muted-foreground group-hover:text-primary transition-colors duration-150">
                        &gt;
                      </span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Status column */}
            <div className={reveal} style={{ transitionDelay: "100ms" }}>
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-4">
                status
              </div>
              <div className="space-y-2 text-foreground/70">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-primary" />
                  <span>online</span>
                </div>
                <div className="text-muted-foreground text-xs" suppressHydrationWarning>
                  {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{ transitionDelay: "200ms" }}
            className={`mt-12 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground transition-opacity duration-300 ease-out ${isInView ? "opacity-100" : "opacity-0"}`}
          >
            <span>zerocaulk</span>
            <span className="flex items-center gap-3 font-mono">
              {timing.initialLoad !== null && (
                <span>
                  <span className="text-foreground/60">load:</span>{" "}
                  <span className="text-foreground/80">{timing.initialLoad}ms</span>
                </span>
              )}
              {timing.navigation !== null && (
                <span>
                  <span className="text-foreground/60">page:</span>{" "}
                  <span className="text-foreground/80">{timing.navigation}ms</span>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
