import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/client.js";

/**
 * Which provider the guide side is acting as.
 *
 * This product has no authentication on either surface — no users table, no
 * sessions, no login. Role-gating still needs *some* notion of who is signed
 * in, so the guide app asks you to pick one of the seeded providers and
 * remembers it locally.
 *
 * That is deliberately a demo identity picker and is labelled as one in the
 * UI. A fake sign-in screen would imply an account system that does not exist,
 * and provider registration and verification are explicitly out of MVP scope
 * (PROJECT.md §5). When real auth arrives, this context keeps its shape and
 * gets its provider from the session instead of from a picker.
 */
const STORAGE_KEY = "terhal.guide.providerId";
const GuideContext = createContext(null);

function stored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function GuideProvider({ children }) {
  const [providerId, setProviderId] = useState(stored);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState(null);
  // How many requests are waiting. Held here rather than in the tab bar so the
  // shell does no data loading, and so a page that accepts a request can
  // correct the badge immediately instead of waiting for a refetch.
  const [pendingCount, setPendingCount] = useState(0);

  // The roster doubles as the picker's options and as the check that a
  // remembered id still exists after a reseed.
  useEffect(() => {
    let cancelled = false;
    api
      .guideProviders()
      .then((rows) => {
        if (cancelled) return;
        setRoster(rows);
        setProviderId((current) =>
          current && rows.some((p) => p.id === current) ? current : null,
        );
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((id) => {
    setProviderId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private browsing: the choice lasts for this session only.
    }
  }, []);

  const signOut = useCallback(() => {
    setProviderId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing was persisted to begin with.
    }
  }, []);

  // Today reports the count directly; other screens can nudge it after acting.
  const refreshPending = useCallback(
    async (id = providerId) => {
      if (!id) return;
      try {
        const today = await api.guideToday(id);
        setPendingCount(today.pending_count ?? 0);
      } catch {
        // A failed count is not worth surfacing; the badge just stays put.
      }
    },
    [providerId],
  );

  useEffect(() => {
    if (providerId) refreshPending(providerId);
    else setPendingCount(0);
  }, [providerId, refreshPending]);

  const provider = useMemo(
    () => roster?.find((p) => p.id === providerId) ?? null,
    [roster, providerId],
  );

  const value = useMemo(
    () => ({
      providerId,
      provider,
      roster,
      error,
      signIn,
      signOut,
      pendingCount,
      setPendingCount,
      refreshPending,
    }),
    [providerId, provider, roster, error, signIn, signOut, pendingCount, refreshPending],
  );
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error("useGuide must be used within GuideProvider");
  return ctx;
}
