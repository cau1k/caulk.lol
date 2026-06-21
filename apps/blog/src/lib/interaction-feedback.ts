import { useCallback, useEffect, useRef } from "react";
import type { Vibration } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";

const FEEDBACK_PREFERENCE_KEY = "caulk-interaction-feedback";
const FEEDBACK_DEBUG_KEY = "caulk-interaction-feedback-debug";

type FeedbackPreference = "auto" | "off" | "haptics" | "sound";
type FeedbackMode = "none" | "haptics" | "sound";
type FeedbackTrigger =
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
  | "buzz"
  | "themeDark"
  | "themeLight";

const FEEDBACK_PATTERNS: Record<FeedbackTrigger, Vibration[]> = {
  selection: [{ duration: 8, intensity: 0.3 }],
  success: [
    { duration: 30 },
    { delay: 60, duration: 40, intensity: 1 },
  ],
  warning: [
    { duration: 40, intensity: 0.8 },
    { delay: 100, duration: 40, intensity: 0.6 },
  ],
  error: [
    { duration: 40, intensity: 0.9 },
    { delay: 40, duration: 40, intensity: 0.9 },
    { delay: 40, duration: 40, intensity: 0.9 },
  ],
  light: [{ duration: 15, intensity: 0.4 }],
  medium: [{ duration: 25, intensity: 0.7 }],
  heavy: [{ duration: 35, intensity: 1 }],
  soft: [{ duration: 40, intensity: 0.5 }],
  rigid: [{ duration: 10, intensity: 1 }],
  nudge: [
    { duration: 80, intensity: 0.8 },
    { delay: 80, duration: 50, intensity: 0.3 },
  ],
  buzz: [{ duration: 1000, intensity: 1 }],
  themeDark: [
    { duration: 80, intensity: 0.8 },
    { delay: 80, duration: 50, intensity: 0.3 },
  ],
  themeLight: [
    { duration: 50, intensity: 0.3 },
    { delay: 80, duration: 80, intensity: 0.8 },
  ],
};

function parsePreference(value: string | null): FeedbackPreference {
  switch (value) {
    case "off":
    case "none":
    case "false":
      return "off";
    case "haptics":
    case "sound":
    case "auto":
      return value;
    default:
      return "auto";
  }
}

function readPreference(): FeedbackPreference {
  try {
    return parsePreference(window.localStorage.getItem(FEEDBACK_PREFERENCE_KEY));
  } catch {
    return "auto";
  }
}

function matchesMediaQuery(query: string): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

function resolveFeedbackMode(): FeedbackMode {
  if (matchesMediaQuery("(prefers-reduced-motion: reduce)")) return "none";

  const preference = readPreference();
  if (preference === "off") return "none";
  if (preference === "sound") return "sound";
  if (preference === "haptics") return "haptics";

  if (matchesMediaQuery("(hover: hover) and (pointer: fine)")) return "sound";
  return "haptics";
}

function isDebugEnabled(): boolean {
  try {
    if (window.localStorage.getItem(FEEDBACK_DEBUG_KEY) === "true") return true;
  } catch {}
  return new URLSearchParams(window.location.search).has("feedbackDebug");
}

function normalizeIntensity(intensity: number | undefined): number {
  if (intensity == null) return 0.7;
  return Math.max(0.1, Math.min(1, intensity));
}

function clonePattern(pattern: Vibration[]): Vibration[] {
  return pattern.map((step) => ({ ...step }));
}

export function useInteractionFeedback() {
  const { trigger: triggerHaptics, isSupported } = useWebHaptics({
    debug: false,
    showSwitch: false,
  });
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      void audioRef.current.close();
      audioRef.current = null;
    };
  }, []);

  const playSound = useCallback(async (pattern: Vibration[]) => {
    if (typeof AudioContext !== "function") return;

    let context = audioRef.current;
    if (!context) {
      context = new AudioContext();
      audioRef.current = context;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    let offsetSeconds = 0;
    const start = context.currentTime;

    for (const step of pattern) {
      offsetSeconds += (step.delay ?? 0) / 1000;

      const intensity = normalizeIntensity(step.intensity);
      const durationSeconds = Math.max(0.01, step.duration / 1000);
      const startAt = start + offsetSeconds;
      const stopAt = startAt + durationSeconds;

      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1100 + intensity * 900, startAt);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1600 + intensity * 1300, startAt);
      filter.Q.setValueAtTime(7, startAt);

      const peak = 0.025 + intensity * 0.03;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt);
      oscillator.stop(stopAt);
      oscillator.onended = () => {
        oscillator.disconnect();
        filter.disconnect();
        gain.disconnect();
      };

      offsetSeconds += durationSeconds;
    }
  }, []);

  const trigger = useCallback(
    (name: FeedbackTrigger) => {
      if (typeof window === "undefined") return;

      const mode = resolveFeedbackMode();
      if (mode === "none") return;

      const pattern = clonePattern(FEEDBACK_PATTERNS[name]);

      if (isDebugEnabled()) {
        console.log("[interaction-feedback:trigger]", {
          mode,
          name,
          isSupported,
          pattern,
        });
      }

      if (mode === "haptics") {
        void triggerHaptics(pattern);
        return;
      }

      void playSound(pattern);
    },
    [isSupported, playSound, triggerHaptics],
  );

  const triggerSelection = useCallback(() => {
    trigger("selection");
  }, [trigger]);

  const triggerSuccess = useCallback(() => {
    trigger("success");
  }, [trigger]);

  const triggerWarning = useCallback(() => {
    trigger("warning");
  }, [trigger]);

  const triggerError = useCallback(() => {
    trigger("error");
  }, [trigger]);

  const triggerLight = useCallback(() => {
    trigger("light");
  }, [trigger]);

  const triggerMedium = useCallback(() => {
    trigger("medium");
  }, [trigger]);

  const triggerHeavy = useCallback(() => {
    trigger("heavy");
  }, [trigger]);

  const triggerSoft = useCallback(() => {
    trigger("soft");
  }, [trigger]);

  const triggerRigid = useCallback(() => {
    trigger("rigid");
  }, [trigger]);

  const triggerNudge = useCallback(() => {
    trigger("nudge");
  }, [trigger]);

  const triggerBuzz = useCallback(() => {
    trigger("buzz");
  }, [trigger]);

  const triggerThemeDark = useCallback(() => {
    trigger("themeDark");
  }, [trigger]);

  const triggerThemeLight = useCallback(() => {
    trigger("themeLight");
  }, [trigger]);

  return {
    trigger,
    triggerSelection,
    triggerSuccess,
    triggerWarning,
    triggerError,
    triggerLight,
    triggerMedium,
    triggerHeavy,
    triggerSoft,
    triggerRigid,
    triggerNudge,
    triggerBuzz,
    triggerThemeDark,
    triggerThemeLight,
  };
}