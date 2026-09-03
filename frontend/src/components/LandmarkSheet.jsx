import { useEffect } from "react";

import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { sizedImage } from "../utils/images.js";
import { Badge, DifficultyBadge } from "./ui.jsx";

/**
 * The detail sheet behind a card. This is where the research phase pays off —
 * history, significance and honest accessibility notes, all sourced.
 */
export default function LandmarkSheet({ landmark, onClose }) {
  const { pick, t } = useLanguage();
  const formatDuration = useFormatDuration();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!landmark) return null;
  const image = sizedImage(landmark.image_url, 900);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="relative max-h-[85%] overflow-y-auto rounded-t-3xl bg-sand-50 shadow-sheet">
        <div className="sticky top-0 z-10 flex justify-center bg-sand-50/95 pb-2 pt-3 backdrop-blur">
          <span className="h-1 w-10 rounded-full bg-sand-300" />
        </div>

        {image ? (
          <img src={image} alt="" className="h-44 w-full object-cover" />
        ) : null}

        <div className="space-y-4 p-5 pb-8">
          <div>
            <h2 className="text-xl font-bold text-sand-900">{pick(landmark, "name")}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{formatDuration(landmark.avg_visit_minutes)}</Badge>
              <DifficultyBadge level={landmark.difficulty} />
              {landmark.requires_guide ? (
                <Badge tone="amber">{t("trip.guideRecommended")}</Badge>
              ) : null}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-sand-700">
            {pick(landmark, "description")}
          </p>

          <Section title={t("provider.accessible")} body={landmark.accessibility_notes} />
          <Section body={pick(landmark, "history")} />
          <Section body={pick(landmark, "significance")} />
          <Section body={landmark.best_time_to_visit} />
          <Section body={landmark.entrance_fee_notes} />

          {landmark.image_attribution ? (
            <p className="border-t border-sand-200 pt-3 text-[11px] leading-snug text-sand-400">
              {landmark.image_attribution}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }) {
  if (!body) return null;
  return (
    <div>
      {title ? (
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-sand-500">
          {title}
        </h3>
      ) : null}
      <p className="text-sm leading-relaxed text-sand-700">{body}</p>
    </div>
  );
}
