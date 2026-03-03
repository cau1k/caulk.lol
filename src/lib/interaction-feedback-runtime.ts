import { WebHaptics } from "web-haptics";

const FEEDBACK_PREFERENCE_KEY = "caulk-interaction-feedback";
const FEEDBACK_DEBUG_KEY = "caulk-interaction-feedback-debug";
const ACTIONABLE_SELECTOR = [
  "button",
  "[role='button']",
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "a[href][data-feedback]",
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
  | "sound-fallback-auto"
  | "unsupported";
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
type FeedbackResolution = {
  mode: FeedbackMode;
  reason: FeedbackReason;
};

declare global {
  interface Window {
    __caulkInteractionFeedbackTeardown?: () => void;
  }
}

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

function isDebugEnabled(): boolean {
  try {
    if (window.localStorage.getItem(FEEDBACK_DEBUG_KEY) === "true") return true;
  } catch {}
  return new URLSearchParams(window.location.search).has("feedbackDebug");
}

function resolveFeedbackMode(supportsVibration: boolean): FeedbackResolution {
  if (matchesMediaQuery("(prefers-reduced-motion: reduce)")) {
    return { mode: "none", reason: "reduced-motion" };
  }

  const preference = readFeedbackPreference();
  const isDesktopPointer = matchesMediaQuery(
    "(hover: hover) and (pointer: fine)",
  );

  if (preference === "off") return { mode: "none", reason: "user-off" };
  if (preference === "haptics") {
    return supportsVibration
      ? { mode: "haptics", reason: "forced-haptics" }
      : { mode: "none", reason: "unsupported" };
  }
  if (preference === "sound") return { mode: "sound", reason: "forced-sound" };

  if (isDesktopPointer) return { mode: "sound", reason: "desktop-auto" };
  if (supportsVibration) return { mode: "haptics", reason: "supported-auto" };

  return { mode: "sound", reason: "sound-fallback-auto" };
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

function getPatternIntensity(pattern: FeedbackPattern): number {
  switch (pattern) {
    case "selection":
      return 0.35;
    case "light":
      return 0.45;
    case "medium":
      return 0.65;
    case "soft":
      return 0.55;
    case "success":
      return 0.75;
    case "warning":
      return 0.8;
    case "error":
    case "heavy":
    case "rigid":
    case "nudge":
    case "buzz":
      return 1;
    default:
      return 0.6;
  }
}

class DesktopClickSound {
  private context: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof AudioContext !== "function") return null;
    this.context = new AudioContext();
    return this.context;
  }

  async play(pattern: FeedbackPattern): Promise<void> {
    const context = this.getContext();
    if (!context) return;
    if (context.state === "suspended") {
      await context.resume();
    }

    const intensity = getPatternIntensity(pattern);
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1200 + intensity * 900, now);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800 + intensity * 1400, now);
    filter.Q.setValueAtTime(8, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035 * intensity, now + 0.0025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.055);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  destroy(): void {
    if (!this.context) return;
    void this.context.close();
    this.context = null;
  }
}

function bootstrapInteractionFeedback(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__caulkInteractionFeedbackTeardown) return;

  const debug = isDebugEnabled();
  const resolution = resolveFeedbackMode(WebHaptics.isSupported);
  const sound = resolution.mode === "sound" ? new DesktopClickSound() : null;
  const haptics =
    resolution.mode === "haptics"
      ? new WebHaptics({ debug: false, showSwitch: false })
      : null;

  if (debug) {
    console.log("[interaction-feedback:init]", {
      mode: resolution.mode,
      reason: resolution.reason,
      supportsVibration: WebHaptics.isSupported,
    });
  }

  if (resolution.mode === "none") return;

  const triggerFeedback = (target: HTMLElement, pattern: FeedbackPattern) => {
    if (debug) {
      console.log("[interaction-feedback:trigger]", {
        mode: resolution.mode,
        pattern,
        element: target.tagName.toLowerCase(),
        id: target.id || null,
        className: target.className || null,
      });
    }

    if (haptics) {
      void haptics.trigger(pattern);
      return;
    }
    if (sound) {
      void sound.play(pattern);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!isPrimaryPointerPress(event)) return;
    const target = findActionableElement(event.target);
    if (!target) return;
    triggerFeedback(target, resolvePattern(target));
  };

  const onClick = (event: MouseEvent) => {
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

  const supportsPointer = typeof PointerEvent === "function";
  if (supportsPointer) {
    document.addEventListener("pointerdown", onPointerDown, true);
  } else {
    document.addEventListener("click", onClick, true);
  }
  document.addEventListener("keydown", onKeyDown, true);

  const teardown = () => {
    if (supportsPointer) {
      document.removeEventListener("pointerdown", onPointerDown, true);
    } else {
      document.removeEventListener("click", onClick, true);
    }
    document.removeEventListener("keydown", onKeyDown, true);
    haptics?.destroy();
    sound?.destroy();
    window.__caulkInteractionFeedbackTeardown = undefined;
  };

  window.__caulkInteractionFeedbackTeardown = teardown;
  window.addEventListener("pagehide", teardown, { once: true });
}

bootstrapInteractionFeedback();
