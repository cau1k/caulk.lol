import type { ClassNameValue } from "tailwind-merge";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassNameValue[]) {
  return twMerge(...inputs);
}

/**
 * Base UI uses `className` as string OR a stateful callback.
 * This helper lets us merge a base class string with either shape.
 */
export function cnState<State>(
  base: ClassNameValue,
  className?: string | ((state: State) => string | undefined),
): string | ((state: State) => string) {
  if (typeof className === "function") {
    return (state: State) => cn(base, className(state));
  }

  return cn(base, className);
}
