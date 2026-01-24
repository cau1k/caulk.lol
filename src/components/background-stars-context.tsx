"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react";

type BackgroundStarsContextType = {
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
};

const BackgroundStarsContext = createContext<BackgroundStarsContextType | null>(
  null
);

export function BackgroundStarsProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);

  return (
    <BackgroundStarsContext value={{ paused, setPaused }}>
      {children}
    </BackgroundStarsContext>
  );
}

export function useBackgroundStars() {
  const ctx = useContext(BackgroundStarsContext);
  if (!ctx) {
    throw new Error(
      "useBackgroundStars must be used within BackgroundStarsProvider"
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
