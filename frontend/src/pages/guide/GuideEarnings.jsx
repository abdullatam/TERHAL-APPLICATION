import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { GuideTopBar } from "../../components/GuideShell.jsx";
import { StatusBar } from "../../components/Shell.jsx";
import { Badge, EmptyState, Spinner } from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";

/**
 * G4 — Earnings.
 *
 * The totals are real sums over real bookings, but every price in this app is
 * demonstration pricing, so every figure here is too. The amber disclosure is
 * the same one used wherever a price appears on the tourist side.
 *
 * The artboard shows a Withdraw button, a next-payout date and a payout
 * account. None of that exists: there is no payment provider, no payout
 * schedule and no account. Withdraw renders inert and labelled rather than as
 * a button that looks live, and the payout date is absent rather than invented.
 */
export default function GuideEarnings() {
  const { t, language } = useLanguage();
  const { providerId } = useGuide();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    api
      .guideEarnings(providerId)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const jod = t("price.jod");
  const peak = Math.max(1, ...(data?.months ?? []).map((m) => m.total_jod));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <GuideTopBar title={t("guide.nav.earnings")} />

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !data ? (
        <Spinner label={t("common.loading")} />
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] pb-4">
          {/* Headline balance. */}
          <div className="rounded-2xl bg-beige p-4">
            <p className="font-sans text-xs font-light text-ink-muted">
              {t("guide.earn.available")}
            </p>
            <p className="mt-1 font-sans text-[32px] font-semibold leading-none tabular-nums text-brown">
              {data.available_jod.toFixed(0)}{" "}
              <span className="text-base font-light text-ink-soft">{jod}</span>
            </p>
            {/* Inert, and says so: there is nothing to withdraw from. */}
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-xl bg-ivory/70 px-3 py-2 font-sans text-xs font-semibold text-ink-soft">
                {t("guide.earn.withdraw")}
              </span>
              <Badge tone="outline">{t("profile.notInBuild")}</Badge>
            </div>
          </div>

          {/* The mock disclosure, same wording pattern as pricing elsewhere. */}
          {data.is_mock ? (
            <p className="rounded-2xl bg-beige p-3 font-sans text-[11px] font-light leading-relaxed text-terracotta">
              {t("guide.earn.mock")}
            </p>
          ) : null}

          <div className="flex gap-2.5">
            <Stat value={data.pending_jod.toFixed(0)} unit={jod} label={t("guide.earn.pending")} />
            <Stat
              value={data.this_month_jod.toFixed(0)}
              unit={jod}
              label={t("guide.earn.thisMonth")}
            />
            <Stat
              value={
                data.next_payout ??
                <span className="text-[13px] font-light">{t("guide.earn.noPayout")}</span>
              }
              label={t("guide.earn.nextPayout")}
            />
          </div>

          {/* Six-month bars. */}
          <div className="rounded-2xl bg-ivory p-4 shadow-hairline">
            <div className="flex items-baseline justify-between">
              <h2 className="font-sans text-[13px] font-medium text-brown">
                {t("guide.earn.sixMonths")}
              </h2>
              <span className="font-mono text-[11px] text-ink-soft">{jod}</span>
            </div>
            <div className="mt-3 flex h-28 items-end gap-2">
              {data.months.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="font-sans text-[10px] tabular-nums text-ink-soft">
                    {m.total_jod > 0 ? m.total_jod.toFixed(0) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-terracotta transition-[height]"
                    style={{
                      // A zero month still shows a hairline, so the axis reads.
                      height: `${Math.max(2, (m.total_jod / peak) * 76)}px`,
                      opacity: m.total_jod > 0 ? 1 : 0.25,
                    }}
                  />
                  <span className="font-sans text-[10px] text-ink-muted">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent trips. */}
          <div>
            <h2 className="mb-2 font-sans text-[15px] font-semibold text-brown">
              {t("guide.earn.recent")}
            </h2>
            {data.recent.length === 0 ? (
              <p className="rounded-2xl bg-beige p-4 text-center font-sans text-sm font-light text-ink-muted">
                {t("guide.earn.empty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.recent.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-3 rounded-2xl bg-ivory p-3.5 shadow-hairline"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-[14px] font-medium text-brown">
                        {(language === "ar" ? b.offering_title_ar : b.offering_title_en) ??
                          t("guide.req.byTheHour")}
                      </p>
                      <p className="font-sans text-xs font-light text-ink-muted">
                        {b.date} · {t("guide.req.people", { n: b.group_size })}
                      </p>
                    </div>
                    <span className="shrink-0 font-sans text-[15px] font-semibold tabular-nums text-terracotta">
                      {b.price_jod.toFixed(0)}
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

function Stat({ value, unit = null, label }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-ivory px-3.5 py-3 shadow-hairline">
      <span className="flex items-baseline gap-1 font-sans text-lg font-semibold tabular-nums text-brown">
        {value}
        {unit ? <span className="text-[11px] font-light text-ink-soft">{unit}</span> : null}
      </span>
      <span className="font-sans text-[11px] font-light leading-tight text-ink-muted">
        {label}
      </span>
    </div>
  );
}
