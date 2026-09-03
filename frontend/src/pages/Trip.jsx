import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import {
  Badge,
  DifficultyBadge,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from "../components/ui.jsx";
import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";
import { sizedImage } from "../utils/images.js";

export default function Trip() {
  const { t, pick, language } = useLanguage();
  const navigate = useNavigate();
  const {
    approved, tripDays, accessibility, itinerary,
    setItinerary, setTripDays, setAccessibility, removeApproved,
  } = useTrip();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  if (!approved.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar title={t("trip.title")} />
        <EmptyState
          title={t("trip.empty")}
          body={t("trip.emptyBody")}
          action={
            <SecondaryButton className="mt-2 w-auto" onClick={() => navigate("/")}>
              {t("trip.goExplore")}
            </SecondaryButton>
          }
        />
      </div>
    );
  }

  const stopCount = itinerary?.days.reduce(
    (n, day) => n + day.stops.filter((s) => s.kind === "landmark").length, 0) ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title={t("trip.title")}
        subtitle={
          itinerary ? t("trip.totalStops", { n: stopCount, d: itinerary.trip_days }) : undefined
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Controls
          tripDays={tripDays}
          accessibility={accessibility}
          onDays={setTripDays}
          onAccessibility={setAccessibility}
        />

        {loading ? <Spinner label={t("common.loading")} /> : null}

        {error ? (
          <div className="mx-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
            {error}
            <button onClick={build} className="mt-2 block font-semibold underline">
              {t("common.retry")}
            </button>
          </div>
        ) : null}

        {!loading && itinerary
          ? itinerary.days.map((day) => (
              <section key={day.day} className="px-4 pb-2 pt-4">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-rose-500">
                  {t("trip.day", { n: day.day })}
                </h2>
                <ol className="space-y-0">
                  {day.stops.map((stop, i) => (
                    <StopRow
                      key={`${day.day}-${stop.order}`}
                      stop={stop}
                      isLast={i === day.stops.length - 1}
                      showAccessibility={accessibility}
                      onRemove={stop.landmark_id ? () => removeApproved(stop.landmark_id) : null}
                    />
                  ))}
                </ol>
              </section>
            ))
          : null}

        {itinerary?.excluded?.length ? (
          <section className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-amber-800">
              {t("trip.excluded")}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {itinerary.excluded.map((item) => (
                <li key={item.landmark_id} className="text-sm text-amber-900">
                  <span className="font-medium">
                    {language === "ar" ? item.name_ar : item.name_en}
                  </span>
                  <span className="text-amber-700">
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

      <div className="shrink-0 border-t border-sand-200 bg-white p-4">
        <PrimaryButton onClick={() => navigate("/advisors")} disabled={!itinerary}>
          {t("trip.bookAdvisor")}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Controls({ tripDays, accessibility, onDays, onAccessibility }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3 border-b border-sand-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-sand-700">{t("explore.tripDays")}</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onDays(n)}
              className={`h-9 w-9 rounded-xl text-sm font-semibold transition ${
                tripDays === n
                  ? "bg-rose-500 text-white"
                  : "bg-sand-100 text-sand-600 active:bg-sand-200"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-medium text-sand-700">
            {t("explore.accessibility")}
          </span>
          <span className="block text-xs text-sand-500">{t("explore.accessibilityHint")}</span>
        </span>
        <input
          type="checkbox"
          checked={accessibility}
          onChange={(e) => onAccessibility(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-rose-500"
        />
      </label>
    </div>
  );
}

function StopRow({ stop, isLast, onRemove, showAccessibility = false }) {
  const { t, pick } = useLanguage();
  const formatDuration = useFormatDuration();
  const isBreak = stop.kind === "break";
  const name = isBreak ? t("trip.lunch") : pick(stop, "name");
  const image = sizedImage(stop.image_url, 200);

  return (
    <li>
      {stop.travel_minutes_from_prev > 0 ? (
        <div className="flex items-center gap-2 ps-[4.25rem] text-[11px] text-sand-400">
          <span className="h-4 w-px bg-sand-300" />
          {t("trip.travel", { n: stop.travel_minutes_from_prev })}
        </div>
      ) : null}

      <div className="flex gap-3">
        <div className="w-14 shrink-0 pt-3 text-end">
          <div className="text-sm font-semibold tabular-nums text-sand-800">{stop.start_time}</div>
          <div className="text-[11px] tabular-nums text-sand-400">{stop.end_time}</div>
        </div>

        <div className="flex flex-1 gap-3 pb-2">
          <div className="flex flex-col items-center pt-4">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                isBreak ? "bg-sand-300" : "bg-rose-500"
              }`}
            />
            {!isLast ? <span className="w-px flex-1 bg-sand-200" /> : null}
          </div>

          <div
            className={`mb-1 flex flex-1 items-center gap-3 rounded-2xl p-2.5 ${
              isBreak ? "bg-sand-100" : "bg-white shadow-sm ring-1 ring-sand-200"
            }`}
          >
            {!isBreak && image ? (
              <img src={image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sand-900">{name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge>{formatDuration(stop.duration_minutes)}</Badge>
                {!isBreak ? <DifficultyBadge level={stop.difficulty} /> : null}
              </div>
              {/* Some places are only partly reachable — Petra's main trail is
                  passable but the climbs beyond it are not. Someone who asked
                  for accessible routes needs to read that, not just trust the
                  filter that let it through. */}
              {showAccessibility && !isBreak && stop.accessibility_notes ? (
                <p className="mt-1.5 text-[11px] leading-snug text-sand-500">
                  {stop.accessibility_notes}
                </p>
              ) : null}
            </div>
            {onRemove ? (
              <button
                onClick={onRemove}
                aria-label={t("trip.remove")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sand-400 active:bg-sand-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
