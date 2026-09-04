import { useCallback, useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { GuideTopBar } from "../../components/GuideShell.jsx";
import { StatusBar } from "../../components/Shell.jsx";
import { useToast } from "../../components/Toast.jsx";
import { Badge, EmptyState, Segmented, Spinner } from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";

/**
 * G2 — Requests. Accept or decline, with a countdown.
 *
 * This is not a bidding screen and must not become one: the team removed that
 * mechanic deliberately. A visitor books directly, the booking arrives here
 * `pending`, and the guide answers yes or no within 24 hours. There is no
 * counter-offer, no price negotiation and no competing bids.
 */
const BUCKETS = ["new", "accepted", "declined"];

export default function GuideRequests() {
  const { t, language } = useLanguage();
  const { providerId, setPendingCount } = useGuide();
  const { toast } = useToast();

  const [bucket, setBucket] = useState("new");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!providerId) return;
    setError(null);
    try {
      // All three buckets, so the tab labels can carry counts like the artboard.
      const [n, a, d] = await Promise.all(
        BUCKETS.map((b) => api.guideRequests(providerId, b)),
      );
      setCounts({ new: n.length, accepted: a.length, declined: d.length });
      setPendingCount(n.length);
      setRows({ new: n, accepted: a, declined: d });
    } catch (err) {
      setError(err.message);
    }
  }, [providerId, setPendingCount]);

  useEffect(() => {
    load();
  }, [load]);

  const answer = async (booking, accept) => {
    setBusy(booking.id);
    try {
      await (accept
        ? api.guideAccept(providerId, booking.id)
        : api.guideDecline(providerId, booking.id));
      toast({
        title: t(accept ? "guide.req.accepted" : "guide.req.declined"),
        body:
          (language === "ar" ? booking.offering_title_ar : booking.offering_title_en) ??
          booking.id,
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const shown = rows?.[bucket] ?? [];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <GuideTopBar title={t("guide.nav.requests")} />

      <div className="shrink-0 px-[22px] pb-3">
        <Segmented
          value={bucket}
          onChange={setBucket}
          options={BUCKETS.map((b) => ({
            value: b,
            label: `${t(`guide.req.${b}`)}${counts[b] ? ` · ${counts[b]}` : ""}`,
          }))}
        />
      </div>

      {error ? (
        <EmptyState title={t("common.error")} body={error} />
      ) : !rows ? (
        <Spinner label={t("common.loading")} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={t(bucket === "new" ? "guide.req.emptyNew" : "guide.req.empty")}
          body={bucket === "new" ? t("guide.req.emptyNewBody") : undefined}
        />
      ) : (
        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-[22px] pb-4">
          {shown.map((booking) => (
            <RequestCard
              key={booking.id}
              booking={booking}
              bucket={bucket}
              busy={busy === booking.id}
              onAnswer={answer}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ booking, bucket, busy, onAnswer }) {
  const { t, language } = useLanguage();
  const title =
    (language === "ar" ? booking.offering_title_ar : booking.offering_title_en) ??
    t("guide.req.byTheHour");
  const when = `${booking.date} · ${booking.start_time}`;

  return (
    <li className="rounded-2xl bg-ivory p-4 shadow-hairline">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* No visitor names exist on a booking — there are no tourist
              accounts — so the booking reference identifies it instead. */}
          <p className="font-mono text-[13px] text-brown">{booking.id}</p>
          <p className="font-sans text-xs font-light text-ink-muted">
            {t("guide.req.people", { n: booking.group_size })}
          </p>
        </div>
        {bucket === "new" ? (
          <Badge tone={booking.expires_in_hours <= 6 ? "terracotta" : "beige"}>
            {t("guide.req.left", { h: booking.expires_in_hours ?? 0 })}
          </Badge>
        ) : (
          <Badge tone={bucket === "accepted" ? "success" : "outline"}>
            {t(`booking.status.${booking.status}`, undefined) || booking.status}
          </Badge>
        )}
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-gray pt-3">
        <Line label={t("guide.req.offering")} value={title} />
        <Line label={t("guide.req.when")} value={when} />
        <Line
          label={t("guide.req.group")}
          value={`${t("guide.req.people", { n: booking.group_size })} · ${booking.price_jod.toFixed(0)} ${t("price.jod")}`}
        />
      </dl>

      {bucket === "new" ? (
        <div className="mt-3 flex gap-2">
          <button
            disabled={busy}
            onClick={() => onAnswer(booking, false)}
            className="flex-1 rounded-xl bg-beige py-2.5 font-sans text-sm font-semibold text-brown active:bg-sandstone/40 disabled:opacity-40"
          >
            {t("guide.req.decline")}
          </button>
          <button
            disabled={busy}
            onClick={() => onAnswer(booking, true)}
            className="flex-1 rounded-xl bg-terracotta py-2.5 font-sans text-sm font-semibold text-ivory active:opacity-90 disabled:opacity-40"
          >
            {t("guide.req.accept")}
          </button>
        </div>
      ) : null}
    </li>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 font-sans text-[11px] font-light uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-end font-sans text-[13px] font-medium text-brown">
        {value}
      </dd>
    </div>
  );
}
