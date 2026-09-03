import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import LandmarkSheet from "../components/LandmarkSheet.jsx";
import { HeaderAction, StatusBar, TopBar } from "../components/Shell.jsx";
import SwipeCard from "../components/SwipeCard.jsx";
import { useToast } from "../components/Toast.jsx";
import { EmptyState, PrimaryButton, SecondaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

const VISIBLE = 3; // cards rendered in the stack at once

/**
 * Explore — screen 09. Visual layer rebuilt from the export; the deck fetch,
 * queue filtering, undo and TripContext wiring are carried over unchanged.
 */
export default function Explore() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { undo: undoToast } = useToast();
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
  const queue = useMemo(() => (all ?? []).filter((l) => !decided.has(l.id)), [all, decided]);

  const handleSwipe = (landmark) => (direction) => {
    (direction === "right" ? approve : skip)(landmark);
    setLastSwiped(landmark);
    setCommand(null);
  };

  const fire = (dir) => setCommand({ dir, token: Date.now() });

  const handleUndo = () => {
    if (!lastSwiped) return;
    undo(lastSwiped);
    setLastSwiped(null);
  };

  if (error) {
    return (
      <Screen>
        <TopBar title={t("explore.title")} showIcon />
        <EmptyState
          title={t("common.offline")}
          body={error}
          action={
            <SecondaryButton
              className="mt-2 w-auto px-6"
              onClick={() => window.location.reload()}
            >
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
        <TopBar title={t("explore.title")} showIcon />
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
        showIcon
        action={
          <HeaderAction
            label={t("explore.filters")}
            onClick={() => navigate("/marketplace")}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M4 7h16M7 12h10M10 17h4" />
            </svg>
          </HeaderAction>
        }
      />

      <div className="relative flex-1 overflow-hidden px-[26px]">
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
              <SecondaryButton className="mt-2 w-auto px-6" onClick={reset}>
                {t("explore.restart")}
              </SecondaryButton>
            }
          />
        )}
      </div>

      {/* Action row: 56px reject · 48px undo · 68px accept, per the export. */}
      <div className="shrink-0 space-y-3 px-[26px] pb-3">
        {stack.length ? (
          <div className="flex items-center justify-center gap-[22px]">
            <button
              onClick={() => fire("left")}
              aria-label={t("explore.skip")}
              className="grid h-14 w-14 place-items-center rounded-full bg-ivory shadow-[inset_0_0_0_1.5px_#D9B28C] transition active:scale-95"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9A8B7E"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>

            <button
              onClick={handleUndo}
              disabled={!lastSwiped}
              aria-label={t("explore.undo")}
              className="grid h-12 w-12 place-items-center rounded-full bg-beige transition active:scale-95 disabled:opacity-40"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3A2A21"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8h11a5 5 0 0 1 0 10h-4" />
                <path d="M7 4L3 8l4 4" />
              </svg>
            </button>

            <button
              onClick={() => fire("right")}
              aria-label={t("explore.add")}
              className="grid h-[68px] w-[68px] place-items-center rounded-full bg-terracotta shadow-cta transition active:scale-95"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FAF6F2"
                strokeWidth="2.1"
                strokeLinecap="round"
              >
                <path d="M12 5.5v13M5.5 12h13" />
              </svg>
            </button>
          </div>
        ) : null}

        {approved.length ? (
          <PrimaryButton onClick={() => navigate("/trip")}>
            {t("explore.done")} · {t("explore.selected", { n: approved.length })}
          </PrimaryButton>
        ) : null}
      </div>

      {sheet ? (
        <LandmarkSheet
          landmark={sheet}
          onClose={() => setSheet(null)}
          onAdd={
            decided.has(sheet.id)
              ? null
              : () => {
                  approve(sheet);
                  setLastSwiped(sheet);
                  setSheet(null);
                  undoToast({
                    title: t("explore.selected", { n: approved.length + 1 }),
                    label: t("trip.undo"),
                    onUndo: () => undo(sheet),
                  });
                }
          }
        />
      ) : null}
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      {children}
    </div>
  );
}
