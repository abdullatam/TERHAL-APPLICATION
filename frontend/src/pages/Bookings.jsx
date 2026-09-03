import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import { Avatar, Badge, EmptyState, Segmented, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * My Bookings — screen 15. The export splits the list into Upcoming and Past
 * tabs; a past trip offers a review, an upcoming one offers cancellation.
 * Fetch and cancel are carried over unchanged.
 */
export default function Bookings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upcoming");

  const load = useCallback(() => {
    api.bookings().then(setBookings).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const cancel = async (booking) => {
    await api.cancelBooking(booking.id);
    toast({ title: t("booking.cancelled.toast"), body: booking.provider?.name });
    load();
  };

  const today = new Date().toISOString().slice(0, 10);
  const { upcoming, past } = useMemo(() => {
    const list = bookings ?? [];
    return {
      upcoming: list.filter((b) => b.date >= today && b.status !== "cancelled"),
      // Cancelled trips are history, whichever side of today they fall on.
      past: list.filter((b) => b.date < today || b.status === "cancelled"),
    };
  }, [bookings, today]);

  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar title={t("booking.viewAll")} onBack={() => navigate("/advisors")} />

      <div className="shrink-0 px-[22px] pb-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: `${t("booking.upcoming")} · ${upcoming.length}` },
            { value: "past", label: `${t("booking.past")} · ${past.length}` },
          ]}
        />
      </div>

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !bookings ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState title={t("booking.none")} />
      ) : (
        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-[22px] pb-3">
          {shown.map((booking) => {
            const cancelled = booking.status === "cancelled";
            const isPast = booking.date < today;
            return (
              <li
                key={booking.id}
                className={`rounded-2xl bg-ivory p-3.5 shadow-hairline ${
                  cancelled ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                  className="flex w-full items-center gap-3 text-start"
                >
                  <Avatar
                    name={booking.provider?.name ?? "?"}
                    url={booking.provider?.photo_url}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[14.5px] font-medium text-brown">
                      {booking.provider?.name}
                    </p>
                    <p className="font-sans text-xs font-light text-ink-muted">
                      {booking.date} · {booking.start_time} ·{" "}
                      {t("price.perTrip", { h: booking.hours, g: booking.group_size })}
                    </p>
                    <div className="mt-1.5">
                      <Badge tone={cancelled ? "outline" : "success"}>
                        {t(
                          cancelled
                            ? "booking.status.cancelled"
                            : isPast
                              ? "booking.status.completed"
                              : "booking.status.confirmed",
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-sans text-[15px] font-semibold tabular-nums text-terracotta">
                      {booking.price_jod.toFixed(0)}
                    </p>
                    <p className="font-sans text-[10px] text-ink-soft">{t("price.jod")}</p>
                  </div>
                </button>

                {!cancelled ? (
                  <div className="mt-2.5 flex gap-2 border-t border-gray pt-2.5">
                    {isPast ? (
                      <button
                        onClick={() => navigate(`/review/${booking.id}`)}
                        className="flex-1 rounded-xl bg-beige py-2 font-sans text-xs font-semibold text-brown active:bg-sandstone/40"
                      >
                        {t("booking.review")}
                      </button>
                    ) : (
                      <button
                        onClick={() => cancel(booking)}
                        className="flex-1 rounded-xl bg-beige py-2 font-sans text-xs font-semibold text-terracotta active:bg-sandstone/40"
                      >
                        {t("booking.cancel")}
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
