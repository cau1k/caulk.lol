"use client";

import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { usePageTiming } from "@/lib/use-page-timing";

const siteLinks = [
  { label: "Archive", to: "/posts" },
  { label: "Links", to: "/links" },
  { label: "About", to: "/about" },
] as const;

const elsewhereLinks = [
  { label: "GitHub", href: "https://github.com/cau1k" },
  { label: "Twitter", href: "https://x.com/zerocaulk" },
  { label: "Forgejo", href: "https://git.caulk.lol" },
] as const;

const linkClassName =
  "inline-block py-2 text-foreground/70 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

/** A full-width colophon. Only the decorative artwork waits for the viewport. */
export function Footer() {
  const timing = usePageTiming();
  const artworkRef = useRef<HTMLDivElement>(null);
  const [loadArtwork, setLoadArtwork] = useState(false);

  useEffect(() => {
    if (!artworkRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLoadArtwork(true);
        observer.disconnect();
      },
      { rootMargin: "600px" },
    );
    observer.observe(artworkRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="relative isolate mt-32 w-full bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 pt-16 sm:pt-24">
        <div className="flex flex-col justify-between gap-12 sm:flex-row sm:gap-8">
          <div className="max-w-xs">
            <Link
              to="/"
              className="inline-flex text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <Logo variant="text" size={64} />
            </Link>
            <p className="mt-5 max-w-[28ch] font-serif text-lg leading-snug text-muted-foreground">
              Thoughts on software, philosophy, and hacking on agent harnesses.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-3 gap-6 font-serif text-base">
            <div>
              <h2 className="mb-5 text-xs font-normal uppercase tracking-wide text-primary sm:text-sm">
                Explore
              </h2>
              <ul>
                {siteLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={linkClassName}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-5 text-xs font-normal uppercase tracking-wide text-primary sm:text-sm">
                Elsewhere
              </h2>
              <ul>
                {elsewhereLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={linkClassName}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-5 text-xs font-normal uppercase tracking-wide text-primary sm:text-sm">
                Colophon
              </h2>
              <ul>
                <li>
                  <Link to="/analytics" className={linkClassName}>
                    Analytics
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/cau1k/caulk.lol" className={linkClassName}>
                    Source
                  </a>
                </li>
                <li>
                  <Link to="/posts/tags" className={linkClassName}>
                    Topics
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>

      {/* White ink becomes the theme's green; black sky becomes transparent.
          Luminance (not alpha) preserves this opaque engraving's fine lines.
          Overlap the empty sky with the intro so the scenery peeks above the
          homepage fold. The overlap scales with the full-width 16:9 mask;
          visible ink still starts below the links at every breakpoint. */}
      <div
        ref={artworkRef}
        aria-hidden="true"
        className="pointer-events-none -mt-[6vw] aspect-video w-full bg-primary [mask-mode:luminance] [mask-size:100%_100%] [mask-repeat:no-repeat] dark:opacity-70"
        style={{
          maskImage: loadArtwork ? 'url("/media/roman.webp")' : "none",
          visibility: loadArtwork ? "visible" : "hidden",
        }}
      />
      {/* Opaque backing guarantees contrast over every part of the drawing;
          the wide, background-colored shadow softens its edges into the art. */}
      <div className="absolute inset-x-0 bottom-8 z-10 mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-background font-serif text-sm text-foreground shadow-[0_0_2rem_1.5rem_var(--background)]">
          <p>
            caulk.lol &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span>{" "}
            &mdash; Zero Caulk
          </p>
          <p className="flex gap-4 font-mono text-[0.625rem] text-muted-foreground">
            {timing.initialLoad !== null && <span>load: {timing.initialLoad}ms</span>}
            {timing.navigation !== null && <span>page: {timing.navigation}ms</span>}
          </p>
        </div>
      </div>
    </footer>
  );
}
