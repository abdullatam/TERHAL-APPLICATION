import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Avatar,
  EmptyState,
  FilterPill,
  PrimaryButton,
  SectionLabel,
  Spinner,
} from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Post-trip review — screen 07. Submits to `POST /bookings/:id/review`, which
 * rejects a review of a trip that has not happened yet: a five-star rating of
 * a trip nobody took is worth nothing to the advisor it is meant to help.
 *
 * If a review already exists it loads into the form, because the endpoint
 * updates rather than duplicating.
 */
const TAGS = [
  "review.tag.gems",
  "review.tag.guide",
  "review.tag.food",
  "review.tag.sunset",
  "review.tag.pacing",
  "review.tag.value",
];

export default function PostTripReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.booking(id), api.review(id).catch(() => null)])
      .then(([bookingData, existing]) => {
        if (cancelled) return;
        setBooking(bookingData);
        if (existing) {
          setStars(existing.stars);
          setTags(existing.tags ?? []);
          setComment(existing.comment ?? "");
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleTag = (tag) =>
    setTags((list) => (list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag]));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.submitReview(id, { stars, tags, comment: comment.trim() || null });
      toast({ title: t("review.thanks") });
      navigate("/bookings", { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (error && !booking) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StatusBar />
        <TopBar title={t("common.error")} onBack={() => navigate("/bookings")} />
        <EmptyState title={t("common.error")} body={error} />
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StatusBar />
        <TopBar title={t("common.loading")} onBack={() => navigate("/bookings")} />
        <Spinner />
      </div>
    );
  }

  const advisor = booking.provider?.name ?? "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar
        title={t("review.title", { place: "Ma'an" })}
        onBack={() => navigate("/bookings")}
      />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-[22px] pb-4">
        <div className="flex items-center gap-3 rounded-2xl bg-beige p-3.5">
          <Avatar name={advisor} url={booking.provider?.photo_url} size={44} />
          <div className="min-w-0">
            <p className="truncate font-sans text-sm font-medium text-brown">
              {t("review.guidedBy", { name: advisor })}
            </p>
            <p className="font-sans text-xs font-light text-ink-muted">
              {booking.date} ·{" "}
              {t("price.perTrip", { h: booking.hours, g: booking.group_size })}
            </p>
          </div>
        </div>

        <div>
          <SectionLabel>{t("review.overall")}</SectionLabel>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setStars(n)}
                aria-label={t("review.stars", { n })}
                aria-pressed={stars === n}
                className="p-1 active:scale-95"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-8 w-8 ${n <= stars ? "text-terracotta" : "text-sandstone"}`}
                  fill={n <= stars ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.3 9.9l6.1-.8z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>{t("review.stoodOut")}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <FilterPill key={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {t(tag)}
              </FilterPill>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>{t("review.tellOthers")}</SectionLabel>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("review.placeholder")}
            rows={4}
            className="w-full resize-none rounded-2xl bg-beige p-3.5 font-sans text-sm font-light leading-relaxed text-brown outline-none placeholder:text-ink-soft focus:ring-1 focus:ring-sandstone"
          />
        </div>

        {error ? (
          <p className="rounded-2xl bg-brown p-3 font-sans text-xs text-ivory">{error}</p>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray bg-ivory p-4">
        <PrimaryButton onClick={submit} disabled={saving || stars === 0}>
          {saving ? t("common.loading") : t("review.submit")}
        </PrimaryButton>
        <p className="text-center font-sans text-[11px] font-light text-ink-soft">
          {t("review.note")}
        </p>
      </div>
    </div>
  );
}
