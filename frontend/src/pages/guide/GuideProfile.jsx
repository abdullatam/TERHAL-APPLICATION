import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import { GuideTopBar } from "../../components/GuideShell.jsx";
import { StatusBar } from "../../components/Shell.jsx";
import { useToast } from "../../components/Toast.jsx";
import {
  Avatar,
  Badge,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  Spinner,
} from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";

/**
 * G6 — Guide profile.
 *
 * Editable: name, bio in both languages, hourly rate. Not editable, and said
 * so: the verified and welfare badges. A provider marking themselves verified
 * would make the badge worthless — awarding it is what the unbuilt
 * verification flow is for.
 *
 * The artboard also shows a reply rate, years guiding, licences on file and a
 * payout account. None of those are fields that exist, and three of them
 * depend on features that were never built (messaging, verification,
 * payments). Each row reports that rather than showing a plausible number.
 */
export default function GuideProfile() {
  const navigate = useNavigate();
  const { t, language, pick } = useLanguage();
  const { providerId, signOut } = useGuide();
  const { toast } = useToast();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    Promise.all([api.guideProfile(providerId), api.reviews().catch(() => [])])
      .then(([p, r]) => {
        if (cancelled) return;
        setProvider(p);
        // Reviews are global until accounts exist; scope to this provider.
        setReviews(r.filter((x) => x.provider_id === providerId));
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const startEdit = () => {
    setDraft({
      name: provider.name,
      bio_en: provider.bio_en ?? "",
      bio_ar: provider.bio_ar ?? "",
      hourly_rate_jod: provider.hourly_rate_jod ?? 0,
    });
    setEditing(true);
  };

  const save = async () => {
    try {
      const updated = await api.guideUpdateProfile(providerId, draft);
      setProvider(updated);
      setEditing(false);
      toast({ title: t("guide.prof.saved") });
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !provider) {
    return (
      <Screen>
        <GuideTopBar title={t("guide.prof.title")} />
        <EmptyState title={t("common.offline")} body={error} />
      </Screen>
    );
  }
  if (!provider) {
    return (
      <Screen>
        <GuideTopBar title={t("guide.prof.title")} />
        <Spinner label={t("common.loading")} />
      </Screen>
    );
  }

  const avgStars = reviews.length
    ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <Screen>
      <GuideTopBar
        title={t("guide.prof.title")}
        action={
          <button
            onClick={() => navigate(`/advisors/${providerId}`)}
            className="shrink-0 rounded-xl bg-beige px-3 py-2 font-sans text-xs font-semibold text-brown active:bg-sandstone/40"
          >
            {t("guide.prof.preview")}
          </button>
        }
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] pb-4">
        <div className="flex items-center gap-4">
          <Avatar name={provider.name} url={provider.photo_url} size={68} />
          <div className="min-w-0">
            <p className="truncate font-sans text-xl font-semibold text-brown">
              {provider.name}
            </p>
            <p className="font-sans text-[12.5px] font-light text-ink-muted">
              {t(`advisors.${provider.role}`)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Badge tone={provider.verified ? "terracotta" : "outline"}>
                {provider.verified ? t("guide.prof.verified") : t("guide.prof.unverified")}
              </Badge>
              {provider.welfare_compliant ? <Badge>{t("provider.welfare")}</Badge> : null}
            </div>
          </div>
        </div>

        <p className="rounded-2xl bg-beige p-3 font-sans text-[11px] font-light leading-relaxed text-ink-body">
          {t("guide.prof.verifyNote")}
        </p>

        {/* Numbers that are real, and numbers that are not. */}
        <div className="flex gap-2.5">
          <Stat value={avgStars ? `★ ${avgStars}` : "—"} label={t("guide.prof.reviews")} />
          <Stat value={reviews.length} label={t("guide.prof.reviews")} />
          <Stat
            value={<span className="text-[11px] font-light">{t("guide.prof.notTracked")}</span>}
            label={t("guide.prof.replyRate")}
          />
        </div>

        {/* About + languages + area, editable where the backend allows it. */}
        <div className="space-y-3 rounded-2xl bg-ivory p-4 shadow-hairline">
          <div className="flex items-baseline justify-between">
            <h2 className="font-sans text-[13px] font-semibold text-brown">
              {t("guide.prof.about")}
            </h2>
            {!editing ? (
              <button
                onClick={startEdit}
                className="font-sans text-xs font-semibold text-terracotta"
              >
                {t("guide.off.edit")}
              </button>
            ) : null}
          </div>

          {editing ? (
            <div className="space-y-3">
              <Field label={t("guide.off.titleEn")}>
                <textarea
                  rows={3}
                  value={draft.bio_en}
                  onChange={(e) => setDraft({ ...draft, bio_en: e.target.value })}
                  className="w-full resize-none rounded-xl bg-beige p-3 font-sans text-sm text-brown outline-none"
                />
              </Field>
              <Field label={t("guide.off.titleAr")}>
                <textarea
                  dir="rtl"
                  rows={3}
                  value={draft.bio_ar}
                  onChange={(e) => setDraft({ ...draft, bio_ar: e.target.value })}
                  className="w-full resize-none rounded-xl bg-beige p-3 font-arabic text-sm text-brown outline-none"
                />
              </Field>
              <Field label={t("guide.prof.rate")}>
                <input
                  type="number"
                  min="0"
                  value={draft.hourly_rate_jod}
                  onChange={(e) =>
                    setDraft({ ...draft, hourly_rate_jod: Number(e.target.value) })
                  }
                  className="w-full rounded-xl bg-beige px-3 py-2.5 font-sans text-sm tabular-nums text-brown outline-none"
                />
              </Field>
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setEditing(false)}>
                  {t("guide.off.cancel")}
                </SecondaryButton>
                <PrimaryButton onClick={save}>{t("guide.off.save")}</PrimaryButton>
              </div>
            </div>
          ) : (
            <p className="font-sans text-sm font-light leading-relaxed text-ink-body">
              {pick(provider, "bio") || t("guide.prof.notTracked")}
            </p>
          )}
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl bg-ivory shadow-hairline">
          <Row
            label={t("guide.prof.languages")}
            value={provider.languages.map((l) => l.toUpperCase()).join(" · ")}
          />
          <Divider />
          <Row
            label={t("guide.prof.area")}
            value={`${provider.landmark_ids?.length ?? 0}`}
          />
          <Divider />
          <Row
            label={t("guide.prof.rate")}
            value={`${(provider.hourly_rate_jod ?? 0).toFixed(0)} ${t("price.jod")}`}
          />
          <Divider />
          <button
            onClick={() => navigate("/guide/offerings")}
            className="flex items-center gap-3 px-4 py-3.5 text-start active:bg-beige"
          >
            <span className="flex-1 font-sans text-sm text-brown">
              {t("guide.prof.offerings")}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-terracotta rtl:-scale-x-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m10 6.5 5.5 5.5L10 17.5" />
            </svg>
          </button>
        </div>

        {/* Design rows with nothing behind them, labelled rather than faked. */}
        <div className="flex flex-col overflow-hidden rounded-2xl bg-ivory shadow-hairline">
          <InertRow label={t("guide.prof.licences")} />
          <Divider />
          <InertRow label={t("guide.prof.payout")} />
          <Divider />
          <InertRow label={t("guide.prof.yearsGuiding")} />
        </div>

        <button
          onClick={signOut}
          className="w-full pb-2 text-center font-sans text-[13.5px] font-semibold text-terracotta"
        >
          {t("guide.signOut")}
        </button>
      </div>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      {children}
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-2xl bg-ivory px-3.5 py-3 shadow-hairline">
      <span className="font-sans text-lg font-semibold tabular-nums text-brown">{value}</span>
      <span className="truncate font-sans text-[11px] font-light text-ink-muted">{label}</span>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex-1 font-sans text-sm text-brown">{label}</span>
      <span className="shrink-0 font-sans text-[13px] font-light text-ink-soft">{value}</span>
    </div>
  );
}

function InertRow({ label }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 opacity-55">
      <span className="flex-1 font-sans text-sm text-brown">{label}</span>
      <span className="shrink-0 rounded-full bg-beige px-2 py-0.5 font-sans text-[10px] font-medium text-ink-muted">
        {t("profile.notInBuild")}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-beige" />;
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-sans text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
