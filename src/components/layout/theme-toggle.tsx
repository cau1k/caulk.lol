"use client";
import { useTheme } from "next-themes";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";

import "./theme-toggle.css";

export function ThemeToggle({
  className,
  mode: _mode = "light-dark",
  ...props
}: ComponentProps<"div"> & {
  mode?: "light-dark" | "light-dark-system";
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <span
      className={cn("theme-toggle", className)}
      {...props}
    >
      <input
        id="theme-toggle-input"
        type="checkbox"
        checked={isDark}
        onChange={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
      />
      <label htmlFor="theme-toggle-input" data-off="☀" data-on="☾">
        <span className="sr-only">Toggle theme</span>
      </label>
    </span>
  );
}
