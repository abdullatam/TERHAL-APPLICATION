import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import { GuideTopBar } from "../../components/GuideShell.jsx";
import { StatusBar } from "../../components/Shell.jsx";
import { useToast } from "../../components/Toast.jsx";
import {
  Badge,
  EmptyState,
  PhotoPlaceholder,
  PrimaryButton,
  SecondaryButton,
  Spinner,
  Stepper,
} from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";

/**
 * G5 — Offerings. The provider-side mirror of what a visitor sees on the
 * Advisor Profile screen, and the thing four of the six guide screens display
 * by name.
 *
 * Fully editable: create, edit, pause, publish, delete. A paused or draft
 * offering is not bookable by a visitor.
 */
export default function GuideOfferings() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { providerId } = useGuide();
  const { toast } = useToast();

  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // offering, or {} for a new one

  const load = useCallback(() => {
    if (!providerId) return;
    api
      .guideOfferings(providerId)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [providerId]);

  useEffect(load, [load]);

  const save = async (draft) => {
    try {
      if (draft.id) {
        await api.guideUpdateOffering(providerId, draft.id, draft);
      } else {
        await api.guideCreateOffering(providerId, draft);
      }
      toast({ title: t("guide.prof.saved"), body: draft.title_en });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (offering, status) => {
    try {
      await api.guideUpdateOffering(providerId, offering.id, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (offering) => {
    try {
      await api.guideDeleteOffering(providerId, offering.id);
      toast({ title: t("guide.off.delete"), body: offering.title_en });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <GuideTopBar
        title={t("guide.off.title")}
        action={
          <button
            onClick={() => setEditing({})}
            className="shrink-0 rounded-xl bg-terracotta px-3 py-2 font-sans text-xs font-semibold text-ivory active:opacity-90"
          >
            {t("guide.off.new")}
          </button>
        }
      />

      {error ? (
        <div className="mx-[22px] mb-2 rounded-2xl bg-beige p-3 font-sans text-xs text-brown">
          {error}
        </div>
      ) : null}

      {!rows ? (
        <Spinner label={t("common.loading")} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("guide.off.empty")}
          body={t("guide.off.emptyBody")}
          action={
            <SecondaryButton className="mt-2 w-auto px-6" onClick={() => setEditing({})}>
              {t("guide.off.new")}
            </SecondaryButton>
          }
        />
      ) : (
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-[22px] pb-4">
          {rows.map((o) => (
            <li key={o.id} className="overflow-hidden rounded-2xl bg-ivory shadow-hairline">
              {/* No offering carries a photograph yet — the table has no image
                  column — so the hatch placeholder stands in honestly. */}
              <div className="relative">
                <PhotoPlaceholder className="h-[104px] w-full" />
                <span className="absolute end-2.5 top-2.5">
                  <Badge tone={o.status === "live" ? "success" : "outline"}>
                    {t(`guide.off.${o.status}`)}
                  </Badge>
                </span>
              </div>

              <div className="space-y-2 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 font-sans text-[15px] font-medium text-brown">
                    {language === "ar" ? o.title_ar : o.title_en}
                  </p>
                  <span className="shrink-0 font-sans text-[15px] font-semibold tabular-nums text-terracotta">
                    {o.price_jod.toFixed(0)}{" "}
                    <span className="text-[10px] font-light text-ink-soft">
                      {t("price.jod")}
                    </span>
                  </span>
                </div>

                <p className="font-sans text-xs font-light text-ink-muted">
                  {t("guide.off.spec", { h: o.hours, n: o.max_group })}
                  {o.landmark_name_en
                    ? ` · ${language === "ar" ? o.landmark_name_ar : o.landmark_name_en}`
                    : ""}
                </p>

                <p className="font-sans text-xs font-light text-ink-soft">
                  {o.trips > 0 ? t("guide.off.trips", { n: o.trips }) : t("guide.off.noTrips")}
                </p>

                <div className="flex gap-2 border-t border-gray pt-2.5">
                  <Action onClick={() => setEditing(o)}>{t("guide.off.edit")}</Action>
                  {o.status === "live" ? (
                    <Action onClick={() => setStatus(o, "paused")}>
                      {t("guide.off.pause")}
                    </Action>
                  ) : (
                    <Action onClick={() => setStatus(o, "live")}>
                      {t("guide.off.publish")}
                    </Action>
                  )}
                  <Action onClick={() => remove(o)} tone="danger">
                    {t("guide.off.delete")}
                  </Action>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <OfferingForm
          offering={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function Action({ children, onClick, tone = "default" }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl py-2 font-sans text-xs font-semibold active:bg-sandstone/40 ${
        tone === "danger" ? "bg-beige text-terracotta" : "bg-beige text-brown"
      }`}
    >
      {children}
    </button>
  );
}

/** Create/edit sheet. Bilingual by construction: both titles are required. */
function OfferingForm({ offering, onCancel, onSave }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState({
    id: offering.id,
    title_en: offering.title_en ?? "",
    title_ar: offering.title_ar ?? "",
    hours: offering.hours ?? 3,
    max_group: offering.max_group ?? 6,
    price_jod: offering.price_jod ?? 0,
    status: offering.status ?? "draft",
  });
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const valid = draft.title_en.trim() && draft.title_ar.trim() && draft.price_jod >= 0;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label={t("guide.off.cancel")}
        onClick={onCancel}
        className="absolute inset-0 bg-brown/50 backdrop-blur-[2px]"
      />
      <div className="relative max-h-[88%] overflow-y-auto rounded-t-[28px] bg-ivory p-5">
        <div className="mb-4 flex justify-center">
          <span className="h-1 w-10 rounded-full bg-sandstone" />
        </div>
        <h2 className="mb-4 font-sans text-lg font-semibold text-brown">
          {t("guide.off.formTitle")}
        </h2>

        <div className="space-y-3">
          <Field label={t("guide.off.titleEn")}>
            <input
              value={draft.title_en}
              onChange={(e) => set({ title_en: e.target.value })}
              className="w-full rounded-xl bg-beige px-3 py-2.5 font-sans text-sm text-brown outline-none"
            />
          </Field>
          <Field label={t("guide.off.titleAr")}>
            <input
              dir="rtl"
              value={draft.title_ar}
              onChange={(e) => set({ title_ar: e.target.value })}
              className="w-full rounded-xl bg-beige px-3 py-2.5 font-arabic text-sm text-brown outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Stepper
              label={t("guide.off.hours")}
              value={draft.hours}
              min={1}
              max={24}
              onChange={(hours) => set({ hours })}
            />
            <Stepper
              label={t("guide.off.maxGroup")}
              value={draft.max_group}
              min={1}
              max={60}
              onChange={(max_group) => set({ max_group })}
            />
          </div>
          <Field label={t("guide.off.price")}>
            <input
              type="number"
              min="0"
              step="1"
              value={draft.price_jod}
              onChange={(e) => set({ price_jod: Number(e.target.value) })}
              className="w-full rounded-xl bg-beige px-3 py-2.5 font-sans text-sm tabular-nums text-brown outline-none"
            />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          <SecondaryButton onClick={onCancel}>{t("guide.off.cancel")}</SecondaryButton>
          <PrimaryButton disabled={!valid} onClick={() => onSave(draft)}>
            {t("guide.off.save")}
          </PrimaryButton>
        </div>
      </div>
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
