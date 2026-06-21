"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

type BackgroundStarsContextType = {
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
  routePaused: boolean;
  setRoutePaused: Dispatch<SetStateAction<boolean>>;
};

const BackgroundStarsContext = createContext<BackgroundStarsContextType | null>(
  null,
);

export function BackgroundStarsProvider({ children }: { children: ReactNode }) {
  const [manualPaused, setPaused] = useState(false);
  const [routePaused, setRoutePaused] = useState(false);
  const paused = manualPaused || routePaused;
  const value = useMemo(
    () => ({ paused, setPaused, routePaused, setRoutePaused }),
    [paused, routePaused],
  );

  return (
    <BackgroundStarsContext value={value}>{children}</BackgroundStarsContext>
  );
}

export function useBackgroundStars() {
  const ctx = useContext(BackgroundStarsContext);
  if (!ctx) {
    throw new Error(
      "useBackgroundStars must be used within BackgroundStarsProvider",
    );
  }
  return ctx;
}

/**
 * Hook that returns null if context is not available.
 * Useful for optional integration.
 */
export function useBackgroundStarsOptional() {
  return useContext(BackgroundStarsContext);
}
