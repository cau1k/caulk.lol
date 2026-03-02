import { useEffect } from "react";

const FEEDBACK_PREFERENCE_KEY = "caulk-interaction-feedback";
const ACTIONABLE_SELECTOR = [
  "button",
  "[role='button']",
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "[data-feedback]",
].join(",");

type FeedbackPreference = "auto" | "off" | "haptics" | "sound";
type FeedbackMode = "none" | "haptics" | "sound";
type FeedbackReason =
  | "reduced-motion"
  | "user-off"
  | "forced-haptics"
  | "forced-sound"
  | "desktop-auto"
  | "supported-auto"
  | "unsupported";
type FeedbackModeResolution = {
  mode: FeedbackMode;
  reason: FeedbackReason;
};
type FeedbackPattern =
  | "selection"
  | "success"
  | "warning"
  | "error"
  | "light"
  | "medium"
  | "heavy"
  | "soft"
  | "rigid"
  | "nudge"
  | "buzz";

function parseFeedbackPreference(value: string | null): FeedbackPreference {
  switch (value) {
    case "none":
    case "false":
    case "off":
      return "off";
    case "true":
    case "on":
      return "auto";
    case "haptics":
    case "sound":
    case "auto":
      return value;
    default:
      return "auto";
  }
}

function matchesMediaQuery(query: string): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

function readFeedbackPreference(): FeedbackPreference {
  try {
    return parseFeedbackPreference(
      window.localStorage.getItem(FEEDBACK_PREFERENCE_KEY),
    );
  } catch {
    return "auto";
  }
}

function resolveFeedbackMode(
  supportsVibration: boolean,
): FeedbackModeResolution {
  const prefersReducedMotion = matchesMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );
  if (prefersReducedMotion) {
    return { mode: "none", reason: "reduced-motion" };
  }

  const preference = readFeedbackPreference();
  const isDesktopPointer = matchesMediaQuery(
    "(hover: hover) and (pointer: fine)",
  );

  if (preference === "off") {
    return { mode: "none", reason: "user-off" };
  }
  if (preference === "haptics") {
    return supportsVibration
      ? { mode: "haptics", reason: "forced-haptics" }
      : { mode: "none", reason: "unsupported" };
  }
  if (preference === "sound") {
    return isDesktopPointer
      ? { mode: "sound", reason: "forced-sound" }
      : { mode: "none", reason: "unsupported" };
  }

  if (isDesktopPointer) return { mode: "sound", reason: "desktop-auto" };
  if (supportsVibration) return { mode: "haptics", reason: "supported-auto" };

  return { mode: "none", reason: "unsupported" };
}

function findActionableElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  const actionable = target.closest(ACTIONABLE_SELECTOR);
  if (!(actionable instanceof HTMLElement)) return null;
  if (actionable.closest("[data-feedback='none']")) return null;
  if (actionable.matches(":disabled, [aria-disabled='true']")) return null;

  return actionable;
}

function isPrimaryPointerPress(event: PointerEvent): boolean {
  if (event.button !== 0) return false;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return false;
  }
  return true;
}

function isActivationKey(event: KeyboardEvent): boolean {
  if (event.repeat) return false;
  return event.key === "Enter" || event.key === " " || event.key === "Spacebar";
}

function isFeedbackPattern(value: string): value is FeedbackPattern {
  switch (value) {
    case "selection":
    case "success":
    case "warning":
    case "error":
    case "light":
    case "medium":
    case "heavy":
    case "soft":
    case "rigid":
    case "nudge":
    case "buzz":
      return true;
    default:
      return false;
  }
}

function resolvePattern(target: HTMLElement): FeedbackPattern {
  const value = target.dataset.feedback;
  if (value && isFeedbackPattern(value)) return value;
  return "selection";
}

export function InteractionFeedbackRuntime() {
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    let cleanup: (() => void) | null = null;
    let destroyed = false;

    void (async () => {
      const { WebHaptics } = await import("web-haptics");
      if (destroyed) return;

      const resolution = resolveFeedbackMode(WebHaptics.isSupported);
      if (isDev) {
        console.log("[interaction-feedback:init]", {
          mode: resolution.mode,
          reason: resolution.reason,
          supportsVibration: WebHaptics.isSupported,
        });
      }
      if (resolution.mode === "none") return;

      const haptics = new WebHaptics({
        debug: resolution.mode === "sound",
        showSwitch: false,
      });

      const triggerFeedback = (
        target: HTMLElement,
        pattern: FeedbackPattern,
      ) => {
        if (isDev) {
          console.log("[interaction-feedback:trigger]", {
            mode: resolution.mode,
            pattern,
            element: target.tagName.toLowerCase(),
            id: target.id || null,
            className: target.className || null,
          });
        }
        void haptics.trigger(pattern);
      };

      const onPointerDown = (event: PointerEvent) => {
        if (!isPrimaryPointerPress(event)) return;
        const target = findActionableElement(event.target);
        if (!target) return;
        triggerFeedback(target, resolvePattern(target));
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (!isActivationKey(event)) return;
        const target = findActionableElement(event.target);
        if (!target) return;
        triggerFeedback(target, resolvePattern(target));
      };

      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);

      cleanup = () => {
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeyDown, true);
        haptics.destroy();
      };
    })().catch((error) => {
      console.warn("[interaction-feedback] failed to initialize", error);
    });

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, []);

  return null;
}
