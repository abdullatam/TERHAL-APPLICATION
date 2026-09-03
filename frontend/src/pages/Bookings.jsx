import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import { Avatar, Badge, EmptyState, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Bookings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.bookings().then(setBookings).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const cancel = async (id) => {
    await api.cancelBooking(id);
    load();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={t("booking.viewAll")} onBack={() => navigate("/advisors")} />

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !bookings ? (
        <Spinner />
      ) : bookings.length === 0 ? (
        <EmptyState title={t("booking.none")} />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-sand-200 overflow-y-auto">
          {bookings.map((booking) => {
            const cancelled = booking.status === "cancelled";
            return (
              <li key={booking.id} className={`p-4 ${cancelled ? "opacity-55" : ""}`}>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={booking.provider?.name ?? "?"}
                    url={booking.provider?.photo_url}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sand-900">
                      {booking.provider?.name}
                    </p>
                    <p className="text-xs text-sand-500">
                      {booking.date} · {booking.start_time} · {booking.id}
                    </p>
                    <div className="mt-1">
                      <Badge tone={cancelled ? "rose" : "green"}>
                        {t(`booking.status.${booking.status}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-bold tabular-nums text-sand-900">
                      {booking.price_jod.toFixed(0)}
                    </p>
                    <p className="text-[10px] text-sand-400">JOD</p>
                  </div>
                </div>
                {!cancelled ? (
                  <button
                    onClick={() => cancel(booking.id)}
                    className="mt-2 text-xs font-semibold text-rose-500 active:opacity-60"
                  >
                    {t("booking.cancel")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
