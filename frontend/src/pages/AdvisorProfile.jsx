import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Avatar,
  Badge,
  EmptyState,
  PhotoPlaceholder,
  PriceBreakdown,
  PrimaryButton,
  SectionLabel,
  Spinner,
  Stepper,
} from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Advisor profile — screen 13. The export leads with a photo band and a stats
 * strip (rating / years / languages); the booking form and price breakdown sit
 * below. Fetch, live re-quote on hours/people change, and the booking POST are
 * carried over unchanged.
 */
export default function AdvisorProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const { toast } = useToast();
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
      toast({
        title: t("booking.confirmed"),
        body: t("booking.with", { name: provider.name }),
      });
      navigate(`/bookings/${result.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setBooking(false);
    }
  };

  if (error && !provider) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StatusBar />
        <TopBar title={t("provider.notFound")} onBack={() => navigate(-1)} />
        <EmptyState title={t("common.error")} body={error} />
      </div>
    );
  }
  if (!provider) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StatusBar />
        <TopBar title={t("common.loading")} onBack={() => navigate(-1)} />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar title={provider.name} onBack={() => navigate(-1)} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] pb-4">
        {/* Photo band. No advisor has a photograph, so this is the honest
            placeholder rather than a stock face. */}
        <PhotoPlaceholder
          label={provider.photo_url ? null : t("common.noPhoto")}
          className="h-[150px] w-full rounded-2xl"
        />

        <div className="flex items-center gap-4">
          <Avatar name={provider.name} url={provider.photo_url} size={64} />
          <div className="min-w-0">
            <p className="font-sans text-sm font-medium text-ink-muted">
              {t(`advisors.${provider.role}`)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {provider.verified ? (
                <Badge tone="terracotta">{t("provider.verified")}</Badge>
              ) : null}
              {provider.welfare_compliant ? <Badge>{t("provider.welfare")}</Badge> : null}
              {provider.accessibility_tags?.map((tag) => (
                <Badge key={tag} tone="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Stats strip, per the export. */}
        <div className="flex divide-x divide-gray rounded-2xl bg-beige py-3 rtl:divide-x-reverse">
          <Stat value={`★ ${provider.rating}`} label={t("provider.rating", { n: "" }).trim()} />
          <Stat
            value={provider.languages.map((l) => l.toUpperCase()).join(" · ")}
            label={t("advisors.languagesLabel")}
          />
          <Stat
            value={provider.distance_km != null ? `${provider.distance_km}` : "—"}
            label="km"
          />
        </div>

        {pick(provider, "bio") ? (
          <p className="font-sans text-sm font-light leading-relaxed text-ink-body">
            {pick(provider, "bio")}
          </p>
        ) : null}

        <div className="space-y-3 rounded-2xl bg-ivory p-4 shadow-hairline">
          <Field label={t("price.date")}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-beige px-3 py-2.5 font-sans text-sm text-brown"
            />
          </Field>
          <Field label={t("price.startTime")}>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl bg-beige px-3 py-2.5 font-sans text-sm text-brown"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Stepper label={t("price.hours")} value={hours} min={1} max={12} onChange={setHours} />
            <Stepper
              label={t("price.people")}
              value={groupSize}
              min={1}
              max={20}
              onChange={setGroupSize}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-ivory p-4 shadow-hairline">
          <SectionLabel>{t("price.breakdown")}</SectionLabel>
          <PriceBreakdown quote={provider.quote} />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray bg-ivory p-4">
        <PrimaryButton onClick={submit} disabled={booking}>
          {booking
            ? t("common.loading")
            : `${t("advisors.requestBooking")} · ${provider.quote.total_jod.toFixed(2)} ${t("price.jod")}`}
        </PrimaryButton>
        <p className="mt-2 text-center font-sans text-[11px] font-light text-ink-soft">
          {t("booking.payNote")}
        </p>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-2">
      <span className="truncate font-sans text-sm font-semibold text-brown">{value}</span>
      <span className="truncate font-sans text-[10px] font-light text-ink-muted">{label}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-sans text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
