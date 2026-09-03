import { useEffect, useRef, useState } from "react";

import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { gallery, sizedImage } from "../utils/images.js";
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
  const shots = gallery(landmark);
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
          <Gallery shots={shots} />

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

            {/* Attribution is per image and rendered under the gallery. */}
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

/**
 * Horizontal snap gallery. The image-sourcing pass targets three photos per
 * place, so this is built for several and degrades to one — or to the honest
 * placeholder for the five places with no free-licensed photograph at all.
 *
 * Attribution is per image and always visible, not tucked away: each photo can
 * carry a different licence and photographer, and the credit has to travel
 * with the picture it belongs to.
 */
function Gallery({ shots }) {
  const { t, language } = useLanguage();
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);

  if (!shots.length) {
    return <PhotoPlaceholder label={t("common.noPhoto")} className="h-52 w-full" />;
  }

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    // Round to the nearest page so the dots track the settled position.
    const page = Math.round(Math.abs(track.scrollLeft) / track.clientWidth);
    setIndex(Math.min(shots.length - 1, Math.max(0, page)));
  };

  const current = shots[index];
  const caption = language === "ar" ? current.caption_ar : current.caption_en;

  return (
    <figure className="m-0">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {shots.map((shot, i) => (
            <img
              key={shot.url}
              src={sizedImage(shot.url, 900)}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              className="h-52 w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>

        {shots.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {shots.map((shot, i) => (
              <span
                key={shot.url}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-ivory" : "w-1.5 bg-ivory/60"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <figcaption className="space-y-0.5 bg-beige px-5 py-2.5">
        {caption ? (
          <p className="font-sans text-xs font-light leading-snug text-ink-body">{caption}</p>
        ) : null}
        {current.attribution_text ? (
          <p className="font-sans text-[10.5px] font-light leading-snug text-ink-soft">
            {current.attribution_text}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}
