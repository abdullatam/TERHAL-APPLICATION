import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import { GuideTopBar } from "../../components/GuideShell.jsx";
import { StatusBar } from "../../components/Shell.jsx";
import { Badge, EmptyState, Spinner } from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";

/**
 * G1 — Today. The guide's dashboard: an accepting/not-accepting state, the
 * day's numbers, today's confirmed schedule, and a nudge when requests are
 * about to lapse.
 *
 * Every figure comes from `GET /guide/:id/today`, which counts the same
 * bookings the tourist app created. The money is demo pricing like every price
 * in the app.
 */
export default function GuideToday() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { providerId, setPendingCount } = useGuide();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!providerId) return;
    api
      .guideToday(providerId)
      .then((res) => {
        setData(res);
        setPendingCount(res.pending_count ?? 0);
      })
      .catch((err) => setError(err.message));
  }, [providerId, setPendingCount]);

  useEffect(load, [load]);

  const dateLine = new Date().toLocaleDateString(language === "ar" ? "ar-JO" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (error) {
    return (
      <Screen>
        <GuideTopBar title={t("guide.nav.today")} />
        <EmptyState title={t("common.offline")} body={error} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <GuideTopBar title={t("guide.nav.today")} />
        <Spinner label={t("common.loading")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <GuideTopBar
        greeting={dateLine}
        title={t("guide.today.greeting", { name: data.provider_name.split(" ")[0] })}
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] pb-4">
        {/* Three-up summary, per the artboard. */}
        <div className="flex gap-2.5">
          <Tile
            value={
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  data.accepting ? "bg-success" : "bg-sandstone"
                }`}
              />
            }
            label={data.accepting ? t("guide.today.accepting") : t("guide.today.notAccepting")}
          />
          <Tile value={data.trips_today} label={t("guide.today.trips")} />
          <Tile
            value={`${data.earnings_today_jod.toFixed(0)}`}
            unit={t("price.jod")}
            label={t("guide.today.earned")}
          />
        </div>

        {/* Requests about to lapse. Only shown when there is something to do. */}
        {data.pending_count > 0 ? (
          <button
            onClick={() => navigate("/guide/requests")}
            className="flex w-full items-center gap-3 rounded-2xl bg-terracotta p-4 text-start active:opacity-90"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ivory/20">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-ivory"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.4V12l3 1.8" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[14.5px] font-semibold text-ivory">
                {t("guide.today.needsYou")}
              </span>
              <span className="block font-sans text-xs font-light text-beige">
                {t("guide.today.expiring", {
                  n: data.pending_count,
                  h: data.soonest_expiry_hours ?? 0,
                })}
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-ivory rtl:-scale-x-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m10 6.5 5.5 5.5L10 17.5" />
            </svg>
          </button>
        ) : null}

        <div className="flex items-baseline justify-between">
          <h2 className="font-sans text-[15px] font-semibold text-brown">
            {t("guide.today.schedule")}
          </h2>
          <button
            onClick={() => navigate("/guide/calendar")}
            className="font-sans text-xs font-semibold text-terracotta"
          >
            {t("guide.today.fullCalendar")}
          </button>
        </div>

        {data.schedule.length === 0 ? (
          <div className="rounded-2xl bg-beige p-5 text-center">
            <p className="font-sans text-sm font-medium text-brown">
              {t("guide.today.empty")}
            </p>
            <p className="mt-1 font-sans text-xs font-light text-ink-muted">
              {t("guide.today.emptyBody")}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {data.schedule.map((booking) => (
              <ScheduleRow
                key={booking.id}
                booking={booking}
                providerId={providerId}
                onChanged={load}
              />
            ))}
          </ul>
        )}
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

function Tile({ value, unit = null, label }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-ivory px-3.5 py-3 shadow-hairline">
      <span className="flex items-baseline gap-1 font-sans text-xl font-semibold tabular-nums text-brown">
        {value}
        {unit ? <span className="text-[11px] font-light text-ink-soft">{unit}</span> : null}
      </span>
      <span className="font-sans text-[11px] font-light leading-tight text-ink-muted">
        {label}
      </span>
    </div>
  );
}

function ScheduleRow({ booking, providerId, onChanged }) {
  const { t, language } = useLanguage();
  const [entering, setEntering] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const title =
    (language === "ar" ? booking.offering_title_ar : booking.offering_title_en) ??
    t("guide.req.byTheHour");

  const running = booking.status === "in_progress";
  const done = booking.status === "completed";

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.guideStartTrip(providerId, booking.id, pin.trim());
      setEntering(false);
      setPin("");
      onChanged();
    } catch (err) {
      // 403 is the wrong PIN; anything else is worth showing verbatim.
      setError(err.status === 403 ? t("guide.trip.pinWrong") : err.message);
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    setBusy(true);
    try {
      await api.guideEndTrip(providerId, booking.id);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl bg-ivory p-3.5 shadow-hairline">
      <div className="flex items-start gap-3">
        <div className="w-14 shrink-0">
          <div className="font-mono text-[13px] text-terracotta">{booking.start_time}</div>
          <div className="font-sans text-[11px] font-light text-ink-soft">
            {t("common.hours", { n: booking.hours })}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[14.5px] font-medium text-brown">{title}</p>
          <p className="truncate font-sans text-xs font-light text-ink-muted">
            {t("guide.req.people", { n: booking.group_size })} ·{" "}
            {done
              ? t("guide.trip.earned", {
                  n: (booking.final_price_jod ?? booking.price_jod).toFixed(0),
                })
              : t("price.estimated", { n: booking.price_jod.toFixed(0) })}
          </p>
        </div>
        {running ? (
          <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 font-sans text-[10px] font-semibold text-success">
            {t("guide.trip.running")}
          </span>
        ) : null}
        {done ? (
          <span className="shrink-0 rounded-full bg-beige px-2 py-0.5 font-sans text-[10px] font-semibold text-ink-muted">
            {t("guide.trip.completed")}
          </span>
        ) : null}
      </div>

      {/* The meeting-point handshake. The guide never sees the PIN — it is
          read out by the tourist standing in front of them. */}
      {entering ? (
        <div className="mt-3 border-t border-gray pt-3">
          <label className="block font-sans text-[11px] font-light text-ink-muted">
            {t("guide.trip.enterPin")}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="––––"
              className="w-28 rounded-xl border border-gray bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-brown outline-none focus:border-terracotta"
            />
            <button
              onClick={start}
              disabled={busy || pin.length < 4}
              className="flex-1 rounded-xl bg-terracotta px-4 py-2 font-sans text-sm font-semibold text-ivory disabled:opacity-40"
            >
              {t("guide.trip.confirm")}
            </button>
            <button
              onClick={() => { setEntering(false); setError(null); setPin(""); }}
              className="rounded-xl px-3 py-2 font-sans text-sm font-medium text-ink-muted"
            >
              {t("guide.trip.cancel")}
            </button>
          </div>
          {error ? (
            <p className="mt-2 font-sans text-xs text-terracotta">{error}</p>
          ) : null}
        </div>
      ) : null}

      {!entering && !done ? (
        <div className="mt-2.5 border-t border-gray pt-2.5">
          {running ? (
            <button
              onClick={end}
              disabled={busy}
              className="w-full rounded-xl border-[1.5px] border-terracotta py-2 font-sans text-[13px] font-semibold text-terracotta active:bg-beige disabled:opacity-40"
            >
              {t("guide.trip.end")}
            </button>
          ) : (
            <button
              onClick={() => setEntering(true)}
              className="w-full rounded-xl bg-terracotta py-2 font-sans text-[13px] font-semibold text-ivory active:opacity-90"
            >
              {t("guide.trip.start")}
            </button>
          )}
          {error && !entering ? (
            <p className="mt-2 font-sans text-xs text-terracotta">{error}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
