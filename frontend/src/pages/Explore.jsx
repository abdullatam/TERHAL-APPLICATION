import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import LandmarkSheet from "../components/LandmarkSheet.jsx";
import { TopBar } from "../components/Shell.jsx";
import SwipeCard from "../components/SwipeCard.jsx";
import { EmptyState, PrimaryButton, SecondaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

const VISIBLE = 3; // cards rendered in the stack at once

export default function Explore() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { approved, skipped, approve, skip, undo, reset } = useTrip();

  const [all, setAll] = useState(null);
  const [error, setError] = useState(null);
  const [command, setCommand] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [lastSwiped, setLastSwiped] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .deck()
      .then((data) => !cancelled && setAll(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const decided = useMemo(
    () => new Set([...approved.map((l) => l.id), ...skipped]),
    [approved, skipped],
  );
  const queue = useMemo(
    () => (all ?? []).filter((l) => !decided.has(l.id)),
    [all, decided],
  );

  const handleSwipe = (landmark) => (direction) => {
    (direction === "right" ? approve : skip)(landmark);
    setLastSwiped(landmark);
    setCommand(null);
  };

  const fire = (dir) => setCommand({ dir, token: Date.now() });

  if (error) {
    return (
      <Screen>
        <TopBar title={t("explore.title")} />
        <EmptyState
          title={t("common.offline")}
          body={error}
          action={
            <SecondaryButton className="mt-2 w-auto" onClick={() => window.location.reload()}>
              {t("common.retry")}
            </SecondaryButton>
          }
        />
      </Screen>
    );
  }

  if (!all) {
    return (
      <Screen>
        <TopBar title={t("explore.title")} />
        <Spinner label={t("common.loading")} />
      </Screen>
    );
  }

  const stack = queue.slice(0, VISIBLE);

  return (
    <Screen>
      <TopBar
        title={t("explore.title")}
        subtitle={
          queue.length
            ? `${t("explore.subtitle")} · ${t("explore.remaining", { n: queue.length })}`
            : t("explore.selected", { n: approved.length })
        }
      />

      <div className="relative flex-1 overflow-hidden px-4 pb-2 pt-4">
        {stack.length ? (
          <div className="relative h-full w-full">
            {/* Reversed so the first card paints last and sits on top. */}
            {stack
              .map((landmark, depth) => (
                <SwipeCard
                  key={landmark.id}
                  landmark={landmark}
                  depth={depth}
                  command={depth === 0 ? command : null}
                  onSwipe={handleSwipe(landmark)}
                  onOpen={setSheet}
                />
              ))
              .reverse()}
          </div>
        ) : (
          <EmptyState
            title={approved.length ? t("explore.emptyTitle") : t("explore.noneTitle")}
            body={approved.length ? t("explore.emptyBody") : t("explore.noneBody")}
            action={
              <SecondaryButton className="mt-2 w-auto" onClick={reset}>
                {t("explore.restart")}
              </SecondaryButton>
            }
          />
        )}
      </div>

      <div className="shrink-0 space-y-3 px-4 pb-3">
        {stack.length ? (
          <div className="flex items-center justify-center gap-5">
            <CircleButton label={t("explore.skip")} tone="rose" onClick={() => fire("left")}>
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </CircleButton>

            <button
              onClick={() => lastSwiped && undo(lastSwiped)}
              disabled={!lastSwiped}
              className="grid h-12 w-12 place-items-center rounded-full border border-sand-300 bg-white text-sand-500 shadow-sm transition active:scale-95 disabled:opacity-30"
              aria-label={t("explore.undo")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h11a5 5 0 0 1 0 10h-4" />
                <path d="M7 4L3 8l4 4" />
              </svg>
            </button>

            <CircleButton label={t("explore.add")} tone="emerald" onClick={() => fire("right")}>
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7L9 18l-5-5" />
              </svg>
            </CircleButton>
          </div>
        ) : null}

        {approved.length ? (
          <PrimaryButton onClick={() => navigate("/trip")}>
            {t("explore.done")} · {t("explore.selected", { n: approved.length })}
          </PrimaryButton>
        ) : null}
      </div>

      {sheet ? <LandmarkSheet landmark={sheet} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

function Screen({ children }) {
  return <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>;
}

function CircleButton({ children, onClick, tone, label }) {
  const tones = {
    rose: "text-rose-500 border-rose-200",
    emerald: "text-emerald-600 border-emerald-200",
  };
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid h-16 w-16 place-items-center rounded-full border-2 bg-white shadow-card transition active:scale-95 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
