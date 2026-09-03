import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * The trip being planned: what was swiped right, the generated timeline, and
 * the trip settings the planner needs.
 *
 * Persisted to localStorage so a refresh — or a phone locking itself mid-demo —
 * does not throw away a plan the user just built by hand.
 */
const STORAGE_KEY = "maan.trip";
const TripContext = createContext(null);

const EMPTY = { approved: [], skipped: [], itinerary: null, tripDays: 2, accessibility: false };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function TripProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable: the trip still works, it just won't survive a reload.
    }
  }, [state]);

  const approve = useCallback((landmark) => {
    setState((s) =>
      s.approved.some((l) => l.id === landmark.id)
        ? s
        : { ...s, approved: [...s.approved, landmark] },
    );
  }, []);

  const skip = useCallback((landmark) => {
    setState((s) => ({ ...s, skipped: [...s.skipped, landmark.id] }));
  }, []);

  /** Reverses the most recent swipe, whichever way it went. */
  const undo = useCallback((landmark) => {
    setState((s) => ({
      ...s,
      approved: s.approved.filter((l) => l.id !== landmark.id),
      skipped: s.skipped.filter((id) => id !== landmark.id),
    }));
  }, []);

  const removeApproved = useCallback((id) => {
    setState((s) => ({ ...s, approved: s.approved.filter((l) => l.id !== id) }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      approve,
      skip,
      undo,
      removeApproved,
      setItinerary: (itinerary) => setState((s) => ({ ...s, itinerary })),
      setTripDays: (tripDays) => setState((s) => ({ ...s, tripDays })),
      setAccessibility: (accessibility) => setState((s) => ({ ...s, accessibility })),
      reset: () => setState(EMPTY),
      // A swiped card should not come back round on the next render.
      isDecided: (id) =>
        state.approved.some((l) => l.id === id) || state.skipped.includes(id),
    }),
    [state, approve, skip, undo, removeApproved],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
