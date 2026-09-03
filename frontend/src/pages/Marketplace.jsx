import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { Avatar, Badge, EmptyState, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Marketplace — screen 06.
 *
 * The export shows priced products ("Layered sand bottle · JOD 12"). Those do
 * not exist: vendors are real provider rows, but nothing models what they
 * sell. Rather than hardcode four items that would read as a real catalogue,
 * this screen lists the real makers and says plainly that the catalogue is
 * still to come — `items_pending` from the API drives that notice. The shape a
 * `market_items` table would need is documented in
 * backend/app/routers/marketplace.py.
 */
export default function Marketplace() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    const timer = setTimeout(() => {
      api
        .marketplace(q ? { q } : undefined)
        .then((res) => !cancelled && setData(res))
        .catch((err) => !cancelled && setError(err.message));
    }, 200); // debounce the search box
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar title={t("market.title")} onBack={() => navigate(-1)} showIcon />

      <div className="shrink-0 space-y-2.5 px-[22px] pb-3">
        <label className="flex items-center gap-2 rounded-xl bg-beige px-3.5 py-2.5">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-ink-soft"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("market.search")}
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-brown outline-none placeholder:text-ink-soft"
          />
        </label>
        <p className="font-sans text-[22px] font-semibold tracking-[-.01em] text-brown">
          {t("market.localFirst")}
        </p>
      </div>

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !data ? (
        <Spinner label={t("common.loading")} />
      ) : data.makers.length === 0 ? (
        <EmptyState title={t("market.none")} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-3">
          {/*
            Honest, not decorative: the design promises a shop and the data
            layer has no products yet, so say so rather than inventing stock.
          */}
          {data.items_pending ? (
            <p className="mb-3 rounded-2xl bg-beige p-3 font-sans text-xs font-light leading-relaxed text-ink-body">
              {t("market.catalogueSoon")}
            </p>
          ) : null}

          <ul className="space-y-2.5">
            {data.makers.map((maker) => (
              <li key={maker.id}>
                <button
                  onClick={() => navigate(`/advisors/${maker.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-ivory p-3.5 text-start shadow-hairline active:bg-beige"
                >
                  <Avatar name={maker.name} url={maker.photo_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[14.5px] font-medium text-brown">
                      {maker.name}
                    </p>
                    <p className="truncate font-sans text-xs font-light text-ink-muted">
                      {t("market.by", {
                        name: t(`advisors.${maker.role}`),
                        place:
                          (language === "ar" ? maker.based_at_ar : maker.based_at_en) ??
                          "Ma'an",
                      })}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="font-sans text-xs font-medium text-brown">
                        ★ {maker.rating}
                      </span>
                      {maker.verified ? <Badge>{t("provider.verified")}</Badge> : null}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
