import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { EmptyState, SecondaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Ma'an Passport — screen 05. Stamps are derived server-side from booking
 * history (`GET /passport`), not stored: a stamp means a confirmed booking
 * whose date has passed, with an advisor who covers that place. So the
 * passport cannot claim a visit that never happened.
 *
 * The progress fill is the second and last permitted use of the brand
 * gradient (the first is Splash).
 */
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar
        title={t("passport.title")}
        subtitle={language === "ar" ? undefined : t("passport.subtitle")}
        onBack={() => navigate("/trip")}
      />

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !passport ? (
        <Spinner label={t("common.loading")} />
      ) : (
        <>
          {/* Progress header on the beige band, per the export. */}
          <div className="relative shrink-0 overflow-hidden bg-beige px-6 pb-5 pt-3">
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
              <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-sans text-[13px] font-medium text-brown">
                    {t("passport.progress", {
                      n: passport.collected,
                      d: passport.total,
                    })}
                  </span>
                </div>
              </div>
              <img
                src="/brand/terhal-icon.png"
                alt=""
                className="h-[38px] w-[38px] shrink-0 object-contain opacity-90"
              />
            </div>

            <div className="relative mt-3 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-terracotta">
                  {passport.percent}%
                </span>
                <span className="font-sans text-xs font-light text-ink-muted">
                  {t("passport.reward", {
                    n: Math.max(0, passport.total - passport.collected),
                  })}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-ivory">
                <div
                  className="h-full rounded-full bg-terhal-progress transition-[width] duration-500"
                  style={{ width: `${passport.percent}%` }}
                />
              </div>
            </div>
          </div>

          {passport.collected === 0 ? (
            <EmptyState
              title={t("passport.empty")}
              body={t("passport.emptyBody")}
              action={
                <SecondaryButton
                  className="mt-2 w-auto px-6"
                  onClick={() => navigate("/advisors")}
                >
                  {t("trip.bookAdvisor")}
                </SecondaryButton>
              }
            />
          ) : null}

          <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {passport.stamps.map((stamp, i) => (
              <li
                key={stamp.landmark_id}
                className={`flex items-center gap-4 ${stamp.stamped ? "" : "opacity-[.62]"}`}
                // The export offsets each row along a meandering path.
                style={{ marginInlineStart: `${[34, 62, 26, 70][i % 4]}px` }}
              >
                <span
                  className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full ${
                    stamp.stamped
                      ? "bg-terracotta"
                      : "bg-ivory shadow-[inset_0_0_0_2px_#D9B28C]"
                  }`}
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
                <div className="min-w-0 flex-1 rounded-2xl bg-ivory px-4 py-3 shadow-hairline">
                  <p className="truncate font-sans text-sm font-medium text-brown">
                    {pick(stamp, "name")}
                  </p>
                  <p className="font-sans text-xs font-light text-ink-muted">
                    {stamp.stamped
                      ? t("passport.stamped", { when: stamp.stamped_on })
                      : language === "ar"
                        ? stamp.locked_reason_ar
                        : stamp.locked_reason_en}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
