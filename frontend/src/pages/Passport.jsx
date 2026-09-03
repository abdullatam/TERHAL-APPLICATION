import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar } from "../components/Shell.jsx";
import { EmptyState, SecondaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Ma'an Passport — screen 05, matched to the artboard.
 *
 * Deliberately not using the shared TopBar: the artboard gives this screen its
 * own header inside the beige band — title, its Arabic name beneath, and the
 * brand mark on the trailing edge — with no back chevron and no language pill.
 *
 * Stamps are derived server-side from booking history (`GET /passport`), so the
 * passport cannot claim a visit that never happened. The progress fill is the
 * second and last permitted use of the brand gradient; Splash is the first.
 */

// Row geometry, straight from the artboard.
const CIRCLE = 52;
const ROW_GAP = 20;
const ROW_H = 62; // circle 52, card 12+15 padding on two text lines
const PITCH = ROW_H + ROW_GAP;
// The artboard weaves rows along a meandering path; these are its offsets.
const OFFSETS = [34, 62, 26, 70];

// Wadi Musa town centre — the same demo position the Advisors map uses.
const HERE = { lat: 30.3216, lon: 35.48 };
const NEAR_KM = 0.2; // inside this, the artboard says "check in to stamp"

function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Eight-point compass bearing, as a translation key suffix. */
function bearingKey(from, to) {
  const dy = to.lat - from.lat;
  const dx = (to.lon - from.lon) * Math.cos((((from.lat + to.lat) / 2) * Math.PI) / 180);
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  const i = Math.round(((deg + 360) % 360) / 45) % 8;
  return ["n", "ne", "e", "se", "s", "sw", "w", "nw"][i];
}

export default function Passport() {
  const navigate = useNavigate();
  const { t, pick, language } = useLanguage();
  const [passport, setPassport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .passport()
      .then((data) => !cancelled && setPassport(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const stamps = passport?.stamps ?? [];
  const remaining = Math.max(0, (passport?.total ?? 0) - (passport?.collected ?? 0));

  // Circle centres, for the connecting path behind the rows.
  const points = useMemo(
    () =>
      stamps.map((_, i) => ({
        x: OFFSETS[i % OFFSETS.length] + CIRCLE / 2,
        y: i * PITCH + ROW_H / 2,
      })),
    [stamps],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />

      {/* --- beige band: own header + progress, per the artboard --- */}
      <div className="relative shrink-0 overflow-hidden bg-beige px-6 pb-[22px] pt-3.5">
        <svg
          viewBox="0 0 390 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[120px] w-full opacity-50"
          fill="none"
        >
          <path d="M0 96 82 40l48 34 56-44 66 54 52-30 86 62v20H0Z" fill="#D9B28C" />
        </svg>

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex flex-col gap-[3px]">
            <h1 className="font-sans text-[26px] font-semibold tracking-[-.01em] text-brown">
              {t("passport.title")}
            </h1>
            {/* The artboard prints both names, whichever language is active. */}
            <span
              dir={language === "ar" ? "ltr" : "rtl"}
              className={`text-sm text-terracotta ${
                language === "ar" ? "font-sans" : "font-arabic"
              }`}
            >
              {language === "ar" ? "Ma'an Passport" : "جواز معان"}
            </span>
          </div>
          <img
            src="/brand/terhal-icon.png"
            alt=""
            className="h-[38px] w-[38px] shrink-0 object-contain opacity-90"
          />
        </div>

        {passport ? (
          <div className="relative mt-[18px] flex flex-col gap-[9px]">
            {/* Count and percentage share one line; the reward sits under the
                bar. That order is the artboard's. */}
            <div className="flex items-baseline justify-between">
              <span className="font-sans text-[13px] font-medium text-brown">
                {t("passport.progress", {
                  n: passport.collected,
                  d: passport.total,
                })}
              </span>
              <span className="font-mono text-xs text-terracotta">{passport.percent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-ivory">
              <div
                className="h-full rounded-full bg-terhal-progress transition-[width] duration-500"
                style={{ width: `${passport.percent}%` }}
              />
            </div>
            <span className="font-sans text-xs font-light text-ink-muted">
              {t("passport.rewardNamed", { n: remaining })}
            </span>
          </div>
        ) : null}
      </div>

      {/* --- the trail --- */}
      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !passport ? (
        <Spinner label={t("common.loading")} />
      ) : passport.collected === 0 ? (
        <EmptyState
          title={t("passport.empty")}
          body={t("passport.emptyBody")}
          action={
            <SecondaryButton className="mt-2 w-auto px-6" onClick={() => navigate("/advisors")}>
              {t("trip.bookAdvisor")}
            </SecondaryButton>
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-[26px]">
          <div className="relative" style={{ height: stamps.length * PITCH }}>
            <Trail points={points} collected={passport.collected} />

            {stamps.map((stamp, i) => (
              <Row
                key={stamp.landmark_id}
                stamp={stamp}
                top={i * PITCH}
                offset={OFFSETS[i % OFFSETS.length]}
                name={pick(stamp, "name")}
                language={language}
                t={t}
              />
            ))}
          </div>
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}

/**
 * The meandering line the artboard draws behind the stamps: solid terracotta
 * through the collected ones, then dashed and faded once the trail reaches
 * places you have not been. Generated from the row offsets rather than
 * hard-coded, so it follows however many stamps the passport holds.
 */
function Trail({ points, collected }) {
  if (points.length < 2) return null;

  const curve = (from, to) => {
    // A vertical-tangent cubic gives the artboard's S-bend between rows.
    const bend = (to.y - from.y) * 0.55;
    return `C ${from.x} ${from.y + bend}, ${to.x} ${to.y - bend}, ${to.x} ${to.y}`;
  };
  const segment = (slice) =>
    slice.length < 2
      ? null
      : `M ${slice[0].x} ${slice[0].y} ` +
        slice.slice(1).map((p, i) => curve(slice[i], p)).join(" ");

  // Overlap by one point so the solid and dashed runs meet without a gap.
  const solid = segment(points.slice(0, Math.max(collected, 1)));
  const dashed = segment(points.slice(Math.max(collected - 1, 0)));

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full rtl:-scale-x-100"
      fill="none"
      strokeLinecap="round"
    >
      {dashed ? (
        <path d={dashed} stroke="#B2543A" strokeWidth="2.5" strokeDasharray="6 9" opacity=".45" />
      ) : null}
      {solid ? <path d={solid} stroke="#B2543A" strokeWidth="2.5" /> : null}
    </svg>
  );
}

function Row({ stamp, top, offset, name, language, t }) {
  return (
    <div
      className={`absolute flex items-center gap-4 ${stamp.stamped ? "" : "opacity-[.62]"}`}
      style={{ top, insetInlineStart: offset, insetInlineEnd: 0, height: ROW_H }}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-full ${
          stamp.stamped ? "bg-terracotta" : "bg-ivory shadow-[inset_0_0_0_2px_#D9B28C]"
        }`}
        style={{ width: CIRCLE, height: CIRCLE }}
      >
        {stamp.stamped ? (
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-ivory"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-[22px] w-[22px] text-terracotta"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="10.5" width="14" height="9" rx="2.5" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
          </svg>
        )}
      </span>

      <div className="min-w-0 flex-1 rounded-[14px] bg-ivory px-[15px] py-3 shadow-hairline">
        <p className="truncate font-sans text-sm font-medium text-brown">{name}</p>
        <p className="truncate font-sans text-xs font-light text-ink-muted">
          {subtitle(stamp, language, t)}
        </p>
      </div>
    </div>
  );
}

/**
 * "Stamped 14 Mar", or how far off a locked place still is.
 *
 * The artboard shows a time as well ("14 Mar · 07:20"), but a stamp is earned
 * from a booking date and no arrival time is recorded — so the date is shown
 * alone rather than inventing an hour.
 */
function subtitle(stamp, language, t) {
  if (stamp.stamped) {
    const when = stamp.stamped_on
      ? new Date(`${stamp.stamped_on}T00:00:00`).toLocaleDateString(
          language === "ar" ? "ar-JO" : "en-GB",
          { day: "numeric", month: "short" },
        )
      : "";
    return t("passport.stamped", { when });
  }
  if (stamp.lat != null && stamp.lon != null) {
    const km = distanceKm(HERE, { lat: stamp.lat, lon: stamp.lon });
    if (km <= NEAR_KM) return t("passport.lockedNear");
    return t("passport.lockedFar", {
      n: Math.round(km),
      dir: t(`passport.dir.${bearingKey(HERE, { lat: stamp.lat, lon: stamp.lon })}`),
    });
  }
  return language === "ar" ? stamp.locked_reason_ar : stamp.locked_reason_en;
}
