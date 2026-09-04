import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../../api/client.js";
import { GuideTopBar } from "../../components/GuideShell.jsx";
import { StatusBar } from "../../components/Shell.jsx";
import { useToast } from "../../components/Toast.jsx";
import { EmptyState, Spinner } from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";

/**
 * G3 — Calendar, with availability management.
 *
 * Bookings come from the same table the tourist app writes. Blocks are the
 * guide's own: a whole-day block is what "Block this day" writes, and removing
 * it is "Open this day". Blocking is recorded but not yet enforced at booking
 * time — that would change the tourist booking path, which was scoped as a
 * separate decision.
 */
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (d) => d.toISOString().slice(0, 10);

export default function GuideCalendar() {
  const { t, language } = useLanguage();
  const { providerId } = useGuide();
  const { toast } = useToast();

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [bookings, setBookings] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const month = monthKey(cursor);

  const load = useCallback(async () => {
    if (!providerId) return;
    setError(null);
    try {
      const [b, k] = await Promise.all([
        api.guideCalendar(providerId, month),
        api.guideAvailability(providerId, month),
      ]);
      setBookings(b);
      setBlocks(k);
    } catch (err) {
      setError(err.message);
    }
  }, [providerId, month]);

  useEffect(() => {
    load();
  }, [load]);

  // The grid: leading blanks so the 1st lands on the right weekday.
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    // Monday-first, which is the Jordanian working week's usual presentation.
    const lead = (first.getDay() + 6) % 7;
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, i) =>
        dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
      ),
    ];
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = {};
    for (const b of bookings ?? []) (map[b.date] ??= []).push(b);
    return map;
  }, [bookings]);

  const wholeDayBlock = (day) =>
    blocks.find((b) => b.date === day && !b.start_time) ?? null;

  const toggleDay = async () => {
    setBusy(true);
    try {
      const existing = wholeDayBlock(selected);
      if (existing) {
        await api.guideUnblock(providerId, existing.id);
        toast({ title: t("guide.cal.openDay"), body: selected });
      } else {
        await api.guideBlock(providerId, { date: selected });
        toast({ title: t("guide.cal.blockDay"), body: selected });
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const today = dayKey(new Date());
  const dayBookings = byDay[selected] ?? [];
  const blocked = Boolean(wholeDayBlock(selected));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <GuideTopBar
        title={t("guide.nav.calendar")}
        subtitle={cursor.toLocaleDateString(language === "ar" ? "ar-JO" : "en-GB", {
          month: "long",
          year: "numeric",
        })}
        action={
          <div className="flex shrink-0 gap-1">
            <Arrow dir="prev" onClick={() => setCursor(shift(cursor, -1))} />
            <Arrow dir="next" onClick={() => setCursor(shift(cursor, 1))} />
          </div>
        }
      />

      {error ? (
        <EmptyState title={t("common.error")} body={error} />
      ) : !bookings ? (
        <Spinner label={t("common.loading")} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-4">
          {/* Legend, per the artboard. */}
          <div className="mb-3 flex flex-wrap gap-3">
            <Key tone="bg-terracotta" label={t("guide.cal.booked")} />
            <Key tone="bg-sandstone" label={t("guide.cal.past")} />
            <Key tone="bg-brown" label={t("guide.cal.blocked")} />
          </div>

          {/* The month grid. Direction is left to the document, so it mirrors. */}
          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((day, i) =>
              day === null ? (
                <span key={`pad-${i}`} />
              ) : (
                <DayCell
                  key={day}
                  day={day}
                  isToday={day === today}
                  selected={day === selected}
                  bookings={byDay[day] ?? []}
                  blocked={Boolean(wholeDayBlock(day))}
                  onSelect={() => setSelected(day)}
                />
              ),
            )}
          </div>

          {/* The selected day. */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-sans text-[15px] font-semibold text-brown">
                {new Date(`${selected}T00:00:00`).toLocaleDateString(
                  language === "ar" ? "ar-JO" : "en-GB",
                  { weekday: "long", day: "numeric" },
                )}
              </h2>
              <button
                onClick={toggleDay}
                disabled={busy}
                className={`rounded-xl px-3 py-2 font-sans text-xs font-semibold disabled:opacity-40 ${
                  blocked
                    ? "bg-brown text-ivory"
                    : "bg-beige text-brown active:bg-sandstone/40"
                }`}
              >
                {blocked ? t("guide.cal.openDay") : t("guide.cal.blockDay")}
              </button>
            </div>

            {blocked ? (
              <p className="mt-2 rounded-2xl bg-beige p-3 font-sans text-xs font-light text-ink-body">
                {t("guide.cal.blockedNote")}
              </p>
            ) : null}

            {dayBookings.length === 0 ? (
              <p className="mt-3 font-sans text-sm font-light text-ink-muted">
                {t("guide.cal.nothing")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {dayBookings.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-start gap-3 rounded-2xl bg-ivory p-3.5 shadow-hairline"
                  >
                    <span className="w-12 shrink-0 font-mono text-[13px] text-terracotta">
                      {b.start_time}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-[14.5px] font-medium text-brown">
                        {(language === "ar" ? b.offering_title_ar : b.offering_title_en) ??
                          t("guide.req.byTheHour")}
                      </span>
                      <span className="block font-sans text-xs font-light text-ink-muted">
                        {t("guide.req.people", { n: b.group_size })} ·{" "}
                        {t(`booking.status.${b.status}`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function shift(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function Arrow({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir}
      className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-beige text-brown active:bg-sandstone/40"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 rtl:-scale-x-100 ${dir === "prev" ? "-scale-x-100" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m10 6.5 5.5 5.5L10 17.5" />
      </svg>
    </button>
  );
}

function Key({ tone, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      <span className="font-sans text-[11px] font-light text-ink-muted">{label}</span>
    </span>
  );
}

function DayCell({ day, isToday, selected, bookings, blocked, onSelect }) {
  const n = Number(day.slice(-2));
  const past = day < new Date().toISOString().slice(0, 10);
  const has = bookings.length > 0;

  // A dot per state, matching the legend rather than colouring the whole cell.
  const dot = blocked
    ? "bg-brown"
    : has && past
      ? "bg-sandstone"
      : has
        ? "bg-terracotta"
        : null;

  return (
    <button
      onClick={onSelect}
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl font-sans text-[13px] tabular-nums transition ${
        selected
          ? "bg-terracotta font-semibold text-ivory"
          : isToday
            ? "bg-beige font-semibold text-brown"
            : "text-brown active:bg-beige"
      }`}
    >
      {n}
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dot ? (selected ? "bg-ivory" : dot) : "bg-transparent"
        }`}
      />
    </button>
  );
}
