import { useTheme } from "next-themes";
import { type ComponentProps, useCallback, useLayoutEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useInteractionFeedback } from "../../lib/interaction-feedback";

import "./theme-toggle.css";

export function ThemeToggle({
  className,
  mode: _mode = "light-dark",
  ...props
}: ComponentProps<"div"> & {
  mode?: "light-dark" | "light-dark-system";
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const { triggerThemeDark, triggerThemeLight } = useInteractionFeedback();
  const [mounted, setMounted] = useState(false);

  // Match the already-themed document before its first hydrated paint, so the
  // control does not briefly advertise the opposite action.
  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const handleToggle = useCallback(() => {
    const newTheme = isDark ? "light" : "dark";
    if (newTheme === "dark") {
      triggerThemeDark();
    } else {
      triggerThemeLight();
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setTheme(newTheme);
      });
    } else {
      setTheme(newTheme);
    }
  }, [isDark, setTheme, triggerThemeDark, triggerThemeLight]);

  return (
    <span className={cn("theme-toggle", className)} {...props}>
      <input
        id="theme-toggle-input"
        type="checkbox"
        checked={isDark}
        onChange={handleToggle}
        aria-label="Toggle theme"
      />
      <label htmlFor="theme-toggle-input">
        <span className="sr-only">Toggle theme</span>
      </label>
    </span>
  );
}
