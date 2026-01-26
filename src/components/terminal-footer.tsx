"use client";

import { Link } from "@tanstack/react-router";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
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
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const timing = usePageTiming();

  return (
    <footer
      ref={ref}
      className="mt-auto"
    >
      <div className="max-w-2xl mx-auto px-4 py-24">
        <div className="font-mono text-sm">
          {/* Main grid */}
          <div className="flex justify-between">
            {/* Nav column */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0 }}
            >
              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-4">
                nav
              </div>
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
            </motion.div>

            {/* Social column */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
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
            </motion.div>

            {/* Status column */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
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
            </motion.div>
          </div>

          {/* Bottom bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-12 pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground"
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
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
