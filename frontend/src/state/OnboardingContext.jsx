import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Whether onboarding has been seen, and which side of the app was chosen at
 * the end of it. Both persisted, so the splash sends a returning visitor
 * straight to their own half of the app instead of walking them through three
 * slides and a role question again — which on a demo device would otherwise
 * happen on every reload.
 *
 * The two flags are separate on purpose: the slides can be skipped, the role
 * cannot, so a device that has seen the slides but never answered the question
 * still owes an answer.
 */
const STORAGE_KEY = "terhal.onboarded";
const ROLE_KEY = "terhal.role";
const ROLES = ["traveller", "guide"];
const OnboardingContext = createContext(null);

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function loadRole() {
  try {
    const value = localStorage.getItem(ROLE_KEY);
    return ROLES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function OnboardingProvider({ children }) {
  const [seen, setSeen] = useState(load);
  const [role, setRole] = useState(loadRole);

  const complete = useCallback(() => {
    setSeen(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private browsing: onboarding just shows again next session.
    }
  }, []);

  /**
   * Which side the app opens on. Set by screen 00 and by the role switch on
   * either profile, so switching sides is remembered the same way choosing
   * one is.
   */
  const chooseRole = useCallback((next) => {
    if (!ROLES.includes(next)) return;
    setRole(next);
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {
      // Private browsing: the choice lasts for this session only.
    }
  }, []);

  /**
   * Signing out puts the device back to a first run — slides and the role
   * question included, since the next person to pick up the phone may not be
   * on the same side of it.
   */
  const reset = useCallback(() => {
    setSeen(false);
    setRole(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ROLE_KEY);
    } catch {
      // Nothing was persisted to begin with.
    }
  }, []);

  const value = useMemo(
    () => ({ seen, role, complete, chooseRole, reset }),
    [seen, role, complete, chooseRole, reset],
  );
  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
