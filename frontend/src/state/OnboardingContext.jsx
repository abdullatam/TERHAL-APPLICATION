import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Whether onboarding has been seen. Persisted, so the splash sends a returning
 * visitor straight to Explore instead of walking them through three slides
 * again — which on a demo device would otherwise happen on every reload.
 */
const STORAGE_KEY = "terhal.onboarded";
const OnboardingContext = createContext(null);

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function OnboardingProvider({ children }) {
  const [seen, setSeen] = useState(load);

  const complete = useCallback(() => {
    setSeen(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private browsing: onboarding just shows again next session.
    }
  }, []);

  /** Signing out puts the device back to a first run, slides included. */
  const reset = useCallback(() => {
    setSeen(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was persisted to begin with.
    }
  }, []);

  const value = useMemo(() => ({ seen, complete, reset }), [seen, complete, reset]);
  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
