import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import {
  Avatar, Badge, EmptyState, PriceBreakdown, PrimaryButton, Spinner,
} from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function AdvisorProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const { itinerary } = useTrip();

  const [hours, setHours] = useState(Number(params.get("hours")) || 4);
  const [groupSize, setGroupSize] = useState(2);
  const [date, setDate] = useState(tomorrow);
  const [startTime, setStartTime] = useState("09:00");

  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .provider(id, { hours, group_size: groupSize })
      .then((data) => !cancelled && setProvider(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, hours, groupSize]);

  const submit = async () => {
    setBooking(true);
    try {
      const result = await api.createBooking({
        provider_id: id,
        itinerary_id: itinerary?.id ?? null,
        date,
        start_time: startTime,
        hours,
        group_size: groupSize,
      });
      navigate(`/bookings/${result.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBooking(false);
    }
  };

  if (error && !provider) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar title={t("provider.notFound")} onBack={() => navigate(-1)} />
        <EmptyState title={t("common.error")} body={error} />
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar title={t("common.loading")} onBack={() => navigate(-1)} />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={provider.name} onBack={() => navigate(-1)} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center gap-4">
          <Avatar name={provider.name} url={provider.photo_url} size={68} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-sand-600">{t(`advisors.${provider.role}`)}</p>
            <p className="text-sm text-sand-500">
              ★ {provider.rating}
              {provider.distance_km != null
                ? ` · ${t("advisors.away", { n: provider.distance_km })}`
                : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {provider.verified ? <Badge tone="green">{t("provider.verified")}</Badge> : null}
              {provider.welfare_compliant ? (
                <Badge tone="blue">{t("provider.welfare")}</Badge>
              ) : null}
              {provider.accessibility_tags?.map((tag) => (
                <Badge key={tag} tone="sand">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>

        {pick(provider, "bio") ? (
          <p className="text-sm leading-relaxed text-sand-700">{pick(provider, "bio")}</p>
        ) : null}

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-sand-500">{t("provider.speaks")}: </span>
            <span className="font-medium text-sand-800">
              {provider.languages.map((l) => l.toUpperCase()).join(" · ")}
            </span>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4">
          <Field label={t("price.date")}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-sand-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label={t("price.startTime")}>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-sand-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Stepper label={t("price.hours")} value={hours} min={1} max={12} onChange={setHours} />
            <Stepper
              label={t("price.people")} value={groupSize} min={1} max={20} onChange={setGroupSize}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-sand-200 bg-white p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500">
            {t("price.breakdown")}
          </h3>
          <PriceBreakdown quote={provider.quote} />
        </div>
      </div>

      <div className="shrink-0 border-t border-sand-200 bg-white p-4">
        <PrimaryButton onClick={submit} disabled={booking}>
          {booking
            ? t("common.loading")
            : `${t("booking.confirm")} · ${provider.quote.total_jod.toFixed(2)} JOD`}
        </PrimaryButton>
        <p className="mt-2 text-center text-[11px] text-sand-500">{t("booking.payNote")}</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-sand-600">{label}</span>
      {children}
    </label>
  );
}

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-sand-600">{label}</span>
      <div className="flex items-center justify-between rounded-xl border border-sand-300 px-1">
        <StepButton onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          −
        </StepButton>
        <span className="text-sm font-semibold tabular-nums text-sand-900">{value}</span>
        <StepButton onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="grid h-9 w-9 place-items-center rounded-lg text-lg font-semibold text-sand-600 active:bg-sand-100 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
