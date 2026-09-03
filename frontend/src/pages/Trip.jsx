import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { HeaderAction, StatusBar, TopBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Badge,
  DifficultyBadge,
  EmptyState,
  FilterPill,
  PhotoPlaceholder,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from "../components/ui.jsx";
import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";
import { sizedImage } from "../utils/images.js";

/**
 * My Trip — screen 11. The export shows a day-pill selector and a single
 * scrolling timeline for the selected day, rather than every day stacked. That
 * is the visual change; the itinerary build, the live rebuild on settings
 * change, and the excluded-with-a-reason panel are carried over.
 */
export default function Trip() {
  const { t, pick, language } = useLanguage();
  const navigate = useNavigate();
  const { undo: undoToast } = useToast();
  const {
    approved, tripDays, accessibility, itinerary,
    setItinerary, setTripDays, setAccessibility, removeApproved, approve,
  } = useTrip();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [showOptions, setShowOptions] = useState(false);

  const ids = useMemo(() => approved.map((l) => l.id), [approved]);
  const idKey = ids.join(",");

  const build = useCallback(async () => {
    if (!ids.length) {
      setItinerary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.buildItinerary({
        landmark_ids: ids,
        trip_days: tripDays,
        accessibility_needs: accessibility,
        language,
      });
      setItinerary(result);
    } catch (err) {
      setError(err.message);
      setItinerary(null);
    } finally {
      setLoading(false);
    }
    // setItinerary is stable from context; idKey stands in for the id array.
  }, [idKey, tripDays, accessibility, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    build();
  }, [build]);

  // Trip length can shrink under the selected day.
  useEffect(() => {
    if (activeDay > tripDays) setActiveDay(tripDays);
  }, [tripDays, activeDay]);

  const handleRemove = (stop) => {
    const landmark = approved.find((l) => l.id === stop.landmark_id);
    removeApproved(stop.landmark_id);
    undoToast({
      title: t("trip.removed"),
      body: pick(stop, "name"),
      label: t("trip.undo"),
      onUndo: () => landmark && approve(landmark),
    });
  };

  if (!approved.length) {
    return (
      <Screen>
        <TopBar title={t("trip.title")} showIcon />
        <EmptyState
          title={t("trip.empty")}
          body={t("trip.emptyBody")}
          action={
            <SecondaryButton className="mt-2 w-auto px-6" onClick={() => navigate("/explore")}>
              {t("trip.goExplore")}
            </SecondaryButton>
          }
        />
      </Screen>
    );
  }

  const stopCount =
    itinerary?.days.reduce(
      (n, day) => n + day.stops.filter((s) => s.kind === "landmark").length,
      0,
    ) ?? 0;
  const day = itinerary?.days.find((d) => d.day === activeDay) ?? itinerary?.days[0];

  return (
    <Screen>
      <TopBar
        title={t("trip.title")}
        subtitle={
          itinerary ? t("trip.totalStops", { n: stopCount, d: itinerary.trip_days }) : undefined
        }
        showIcon
        action={
          <HeaderAction
            label={t("trip.options")}
            onClick={() => setShowOptions((v) => !v)}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="12" cy="5.5" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="12" cy="18.5" r="1.4" />
            </svg>
          </HeaderAction>
        }
      />

      {/* Day pills — the export's primary navigation for this screen. */}
      <div className="flex shrink-0 gap-2 overflow-x-auto px-[22px] pb-3.5 no-scrollbar">
        {Array.from({ length: tripDays }, (_, i) => i + 1).map((n) => (
          <FilterPill key={n} active={activeDay === n} onClick={() => setActiveDay(n)}>
            {t("trip.day", { n })}
          </FilterPill>
        ))}
      </div>

      {showOptions ? (
        <Options
          tripDays={tripDays}
          accessibility={accessibility}
          onDays={setTripDays}
          onAccessibility={setAccessibility}
          onPassport={() => navigate("/passport")}
          onMarket={() => navigate("/marketplace")}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px]">
        {loading ? <Spinner label={t("common.loading")} /> : null}

        {error ? (
          <div className="rounded-2xl bg-beige p-4 font-sans text-sm text-brown">
            {error}
            <button onClick={build} className="mt-2 block font-semibold text-terracotta underline">
              {t("common.retry")}
            </button>
          </div>
        ) : null}

        {!loading && day ? (
          <div className="relative">
            {/* Continuous rail behind the dots. */}
            <div className="absolute bottom-6 start-[37px] top-3.5 w-0.5 bg-tint-rail" />
            <ol className="relative flex flex-col gap-3.5 pb-2">
              {day.stops.map((stop) => (
                <StopRow
                  key={`${day.day}-${stop.order}`}
                  stop={stop}
                  showAccessibility={accessibility}
                  onRemove={stop.landmark_id ? () => handleRemove(stop) : null}
                />
              ))}
              <li className="ms-[46px]">
                <button
                  onClick={() => navigate("/explore")}
                  className="flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-sandstone font-sans text-[13.5px] font-medium text-terracotta active:bg-beige"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 5.5v13M5.5 12h13" />
                  </svg>
                  {t("trip.addStop")}
                </button>
              </li>
            </ol>
          </div>
        ) : null}

        {itinerary?.excluded?.length ? (
          <section className="mt-4 rounded-2xl bg-beige p-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wide text-terracotta">
              {t("trip.excluded")}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {itinerary.excluded.map((item) => (
                <li key={item.landmark_id} className="font-sans text-sm text-brown">
                  <span className="font-medium">
                    {language === "ar" ? item.name_ar : item.name_en}
                  </span>
                  <span className="font-light text-ink-muted">
                    {" "}
                    — {language === "ar" ? item.reason_ar : item.reason_en}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="h-4" />
      </div>

      <div className="shrink-0 border-t border-gray bg-ivory p-4">
        <PrimaryButton onClick={() => navigate("/advisors")} disabled={!itinerary}>
          {t("trip.bookAdvisor")}
        </PrimaryButton>
      </div>
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

/** Trip settings, revealed from the header's overflow button. */
function Options({ tripDays, accessibility, onDays, onAccessibility, onPassport, onMarket }) {
  const { t } = useLanguage();
  return (
    <div className="shrink-0 space-y-3 border-y border-gray bg-beige px-[22px] py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-sm font-medium text-brown">{t("explore.tripDays")}</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onDays(n)}
              className={`h-9 w-9 rounded-xl font-sans text-sm font-semibold transition ${
                tripDays === n ? "bg-terracotta text-ivory" : "bg-ivory text-brown"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start justify-between gap-3">
        <span>
          <span className="block font-sans text-sm font-medium text-brown">
            {t("explore.accessibility")}
          </span>
          <span className="block font-sans text-xs font-light text-ink-muted">
            {t("explore.accessibilityHint")}
          </span>
        </span>
        <input
          type="checkbox"
          checked={accessibility}
          onChange={(e) => onAccessibility(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-terracotta"
        />
      </label>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onPassport}
          className="flex-1 rounded-xl bg-ivory py-2.5 font-sans text-xs font-semibold text-brown active:bg-sandstone/30"
        >
          {t("trip.passport")}
        </button>
        <button
          onClick={onMarket}
          className="flex-1 rounded-xl bg-ivory py-2.5 font-sans text-xs font-semibold text-brown active:bg-sandstone/30"
        >
          {t("trip.marketplace")}
        </button>
      </div>
    </div>
  );
}

function StopRow({ stop, onRemove, showAccessibility = false }) {
  const { t, pick } = useLanguage();
  const formatDuration = useFormatDuration();
  const isBreak = stop.kind === "break";
  const name = isBreak ? t("trip.lunch") : pick(stop, "name");
  const image = sizedImage(stop.image_url, 200);

  return (
    <li className="flex items-start gap-3.5">
      {/* Dot column, ring-cut out of the ivory ground so the rail breaks. */}
      <div className="flex w-8 shrink-0 justify-center pt-4">
        <div
          className={`h-[13px] w-[13px] rounded-full ring-4 ring-ivory ${
            isBreak ? "bg-ivory shadow-[0_0_0_2px_#D9B28C]" : "bg-terracotta"
          }`}
        />
      </div>

      <div
        className={`flex flex-1 flex-col gap-2.5 rounded-2xl p-3.5 ${
          isBreak ? "bg-beige" : "bg-ivory shadow-hairline"
        }`}
      >
        <div className="flex gap-3">
          {!isBreak && image ? (
            <img
              src={image}
              alt=""
              className="h-[54px] w-[54px] shrink-0 rounded-xl object-cover"
            />
          ) : (
            <PhotoPlaceholder
              variant={isBreak ? "hatch-alt" : "hatch-sm"}
              className="h-[54px] w-[54px] shrink-0 rounded-xl"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-mono text-[11.5px] text-terracotta">
              {stop.start_time}
              {stop.travel_minutes_from_prev > 0 ? (
                <span className="font-sans font-light text-ink-soft">
                  {" · "}
                  {t("trip.travel", { n: stop.travel_minutes_from_prev })}
                </span>
              ) : null}
            </span>
            <span className="truncate font-sans text-[14.5px] font-medium text-brown">
              {name}
            </span>
            <span className="font-sans text-xs font-light text-ink-muted">
              {formatDuration(stop.duration_minutes)}
            </span>
          </div>
          {onRemove ? (
            <button
              onClick={onRemove}
              aria-label={t("trip.remove")}
              className="-me-1 grid h-8 w-8 shrink-0 place-items-center self-start rounded-full text-ink-soft active:bg-beige"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!isBreak ? <DifficultyBadge level={stop.difficulty} /> : null}
          {isBreak ? <Badge tone="success">{t("trip.lunch")}</Badge> : null}
        </div>

        {/*
          Some places are only partly reachable — Petra's main trail is passable
          but the climbs beyond it are not. Someone who asked for accessible
          routes needs to read that, not just trust the filter that let it
          through.
        */}
        {showAccessibility && !isBreak && stop.accessibility_notes ? (
          <p className="font-sans text-[11px] font-light leading-snug text-ink-soft">
            {stop.accessibility_notes}
          </p>
        ) : null}
      </div>
    </li>
  );
}
