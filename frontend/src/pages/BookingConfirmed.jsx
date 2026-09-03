import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import {
  Avatar, EmptyState, PriceBreakdown, PrimaryButton, SecondaryButton, Spinner,
} from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function BookingConfirmed() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.booking(id).then(setBooking).catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar title={t("common.error")} onBack={() => navigate("/advisors")} />
        <EmptyState title={t("common.error")} body={error} />
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar title={t("common.loading")} />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={t("booking.confirmed")} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-600" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7L9 18l-5-5" />
            </svg>
          </div>
          <p className="text-center text-sm text-sand-600">
            {t("booking.with", { name: booking.provider?.name ?? "" })}
          </p>
          <div className="rounded-2xl bg-sand-100 px-5 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wide text-sand-500">
              {t("booking.code")}
            </p>
            <p className="font-mono text-xl font-bold tracking-widest text-sand-900">
              {booking.id}
            </p>
          </div>
        </div>

        {booking.provider ? (
          <div className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-4">
            <Avatar name={booking.provider.name} url={booking.provider.photo_url} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sand-900">{booking.provider.name}</p>
              <p className="text-xs text-sand-500">
                {booking.date} · {booking.start_time} ·{" "}
                {t("price.perTrip", { h: booking.hours, g: booking.group_size })}
              </p>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500">
            {t("price.breakdown")}
          </h3>
          <PriceBreakdown quote={booking.quote} />
        </div>

        <p className="rounded-2xl bg-sand-100 p-3 text-center text-xs leading-relaxed text-sand-600">
          {t("booking.emergency")}
        </p>
      </div>

      <div className="shrink-0 space-y-2 border-t border-sand-200 bg-white p-4">
        <PrimaryButton onClick={() => navigate("/trip")}>{t("booking.done")}</PrimaryButton>
        <SecondaryButton onClick={() => navigate("/bookings")}>
          {t("booking.viewAll")}
        </SecondaryButton>
      </div>
    </div>
  );
}
