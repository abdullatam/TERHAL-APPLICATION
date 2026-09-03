import { useEffect } from "react";

import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { sizedImage } from "../utils/images.js";
import { Badge, DifficultyBadge, PhotoPlaceholder, PrimaryButton, SectionLabel } from "./ui.jsx";

/**
 * Landmark detail sheet — screen 10. This is where the research phase pays
 * off: history, significance and honest accessibility notes, all sourced.
 *
 * The export shows the Arabic name under the English one permanently, not only
 * in Arabic mode — the place has two real names and both belong on the card.
 * So `name_ar` renders as a secondary line regardless of active language,
 * while everything else follows the language toggle.
 */
export default function LandmarkSheet({ landmark, onClose, onAdd = null }) {
  const { pick, t, language } = useLanguage();
  const formatDuration = useFormatDuration();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!landmark) return null;
  const image = sizedImage(landmark.image_url, 900);
  // In Arabic the heading is already Arabic; the pair is then EN underneath.
  const secondaryName = language === "ar" ? landmark.name_en : landmark.name_ar;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-brown/50 backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[88%] flex-col overflow-hidden rounded-t-[28px] bg-ivory">
        <div className="sticky top-0 z-10 flex shrink-0 justify-center bg-ivory/95 pb-2 pt-3 backdrop-blur">
          <span className="h-1 w-10 rounded-full bg-sandstone" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {image ? (
            <img src={image} alt="" className="h-44 w-full object-cover" />
          ) : (
            <PhotoPlaceholder label={t("common.noPhoto")} className="h-44 w-full" />
          )}

          <div className="space-y-4 p-5 pb-8">
            <div>
              <h2 className="font-sans text-[22px] font-semibold leading-tight text-brown">
                {pick(landmark, "name")}
              </h2>
              {secondaryName ? (
                <p
                  dir={language === "ar" ? "ltr" : "rtl"}
                  className={`mt-0.5 text-base text-terracotta ${
                    language === "ar" ? "font-sans" : "font-arabic"
                  }`}
                >
                  {secondaryName}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="terracotta">{t("explore.hiddenGem")}</Badge>
                {landmark.entrance_fee_notes?.toLowerCase().includes("free") ? (
                  <Badge>{t("explore.freeEntry")}</Badge>
                ) : null}
                <Badge>{formatDuration(landmark.avg_visit_minutes)}</Badge>
                <DifficultyBadge level={landmark.difficulty} />
                {landmark.requires_guide ? (
                  <Badge tone="outline">{t("trip.guideRecommended")}</Badge>
                ) : null}
              </div>
            </div>

            <p className="font-sans text-sm font-light leading-relaxed text-ink-body">
              {pick(landmark, "description")}
            </p>

            <Section title={t("provider.accessible")} body={landmark.accessibility_notes} />
            <Section body={pick(landmark, "history")} />
            <Section body={pick(landmark, "significance")} />
            <Section body={landmark.best_time_to_visit} />
            <Section body={landmark.entrance_fee_notes} />

            {landmark.image_attribution ? (
              <p className="border-t border-gray pt-3 font-sans text-[11px] font-light leading-snug text-ink-soft">
                {landmark.image_attribution}
              </p>
            ) : null}
          </div>
        </div>

        {onAdd ? (
          <div className="shrink-0 border-t border-gray bg-ivory p-4">
            <PrimaryButton onClick={onAdd}>{t("booking.addToTrip")}</PrimaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, body }) {
  if (!body) return null;
  return (
    <div>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <p className="font-sans text-sm font-light leading-relaxed text-ink-body">{body}</p>
    </div>
  );
}
