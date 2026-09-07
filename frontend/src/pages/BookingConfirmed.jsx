import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import {
  Avatar,
  EmptyState,
  PriceBreakdown,
  TripPin,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  Spinner,
} from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Booking confirmed — screen 14. The export leads with a success medallion and
 * a labelled fact list (When / Meeting point / Paid / Reference), then the
 * price breakdown. Fetch and the emergency-contact notice are carried over.
 */
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
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StatusBar />
        <TopBar title={t("common.error")} onBack={() => navigate("/advisors")} />
        <EmptyState title={t("common.error")} body={error} />
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StatusBar />
        <TopBar title={t("common.loading")} />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar
        title={t(
          booking.status === "confirmed" ? "booking.confirmed" : "booking.requested",
        )}
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] pb-4">
        <div className="flex flex-col items-center gap-3 py-3">
          <div
            className={`grid h-16 w-16 place-items-center rounded-full ${
              booking.status === "confirmed" ? "bg-terracotta" : "bg-beige"
            }`}
          >
            {booking.status === "confirmed" ? (
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-ivory"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : (
              // Pending: an hourglass, not a tick. The trip is not booked yet.
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-terracotta"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.4V12l3 1.8" />
              </svg>
            )}
          </div>
          <p className="text-center font-sans text-sm font-light text-ink-body">
            {booking.status === "confirmed"
              ? t("booking.with", { name: booking.provider?.name ?? "" })
              : t("booking.awaiting", { name: booking.provider?.name ?? "" })}
          </p>
          {/*
            A guide has 24 hours to answer (see backend/app/routers/guide.py).
            Saying "confirmed" here while the request is still pending would be
            the one dishonest screen in the app.
          */}
          {booking.status === "pending" ? (
            <p className="max-w-[16rem] text-center font-sans text-xs font-light leading-relaxed text-ink-muted">
              {t("booking.awaitingBody")}
            </p>
          ) : null}
          {booking.status === "declined" || booking.status === "expired" ? (
            <p className="max-w-[17rem] rounded-2xl bg-beige p-3 text-center font-sans text-xs font-light leading-relaxed text-ink-body">
              {t("booking.declinedNote")}
            </p>
          ) : null}
        </div>

        {booking.provider ? (
          <div className="flex items-center gap-3 rounded-2xl bg-ivory p-4 shadow-hairline">
            <Avatar name={booking.provider.name} url={booking.provider.photo_url} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-[14.5px] font-medium text-brown">
                {booking.provider.name}
              </p>
              <p className="font-sans text-xs font-light text-ink-muted">
                {t(`advisors.${booking.provider.role}`)}
              </p>
            </div>
          </div>
        ) : null}

        {booking.status === "confirmed" || booking.status === "in_progress" ? (
          <TripPin pin={booking.pin} />
        ) : null}

        <div className="divide-y divide-gray rounded-2xl bg-ivory shadow-hairline">
          <Fact label={t("booking.when")} value={`${booking.date} · ${booking.start_time}`} />
          <Fact
            label={t("price.perTrip", { h: booking.hours, g: booking.group_size })}
            value={`${booking.hours}h · ${booking.group_size}`}
          />
          <Fact
            label={t(booking.final_price_jod != null ? "price.final" : "price.estimate")}
            value={`${(booking.final_price_jod ?? booking.price_jod).toFixed(2)} ${t("price.jod")}`}
          />
          <Fact label={t("booking.reference")} value={booking.id} mono />
        </div>

        <div className="rounded-2xl bg-ivory p-4 shadow-hairline">
          <SectionLabel>{t("price.breakdown")}</SectionLabel>
          <PriceBreakdown quote={booking.final_quote ?? booking.quote} />
          {booking.final_quote ? (
            <p className="mt-2 font-sans text-[11px] font-light leading-snug text-ink-soft">
              {t("price.settledNote")}
            </p>
          ) : null}
        </div>

        <p className="rounded-2xl bg-beige p-3 text-center font-sans text-xs font-light leading-relaxed text-ink-body">
          {t("booking.emergency")}
        </p>
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray bg-ivory p-4">
        <PrimaryButton onClick={() => navigate("/trip")}>
          {t("booking.addToTrip")}
        </PrimaryButton>
        <SecondaryButton onClick={() => navigate("/bookings")}>
          {t("booking.viewAll")}
        </SecondaryButton>
      </div>
    </div>
  );
}

function Fact({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="font-sans text-xs font-light text-ink-muted">{label}</span>
      <span
        className={`truncate text-end text-sm font-semibold text-brown ${
          mono ? "font-mono tracking-widest" : "font-sans tabular-nums"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
