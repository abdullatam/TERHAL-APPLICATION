import { useNavigate } from "react-router-dom";

import { StatusBar } from "../../components/Shell.jsx";
import { Avatar, Badge, EmptyState, Spinner } from "../../components/ui.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { useGuide } from "../../state/GuideContext.jsx";
import { useOnboarding } from "../../state/OnboardingContext.jsx";

/**
 * The demo identity picker.
 *
 * Not in the design export — the six screens all assume a signed-in guide, and
 * this product has no authentication on either surface. Rather than build a
 * login form that implies an account system, this asks plainly which seeded
 * provider you want to act as, and says why.
 */
export default function GuideSignIn() {
  const navigate = useNavigate();
  const { t, pick, language } = useLanguage();
  const { roster, error, signIn } = useGuide();
  const { chooseRole } = useOnboarding();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />

      <div className="shrink-0 px-[22px] pb-4 pt-2">
        <img
          src="/brand/terhal-lockup.png"
          alt="Terhal"
          className="mb-4 block h-auto w-[150px]"
        />
        <h1 className="font-sans text-2xl font-semibold tracking-[-.01em] text-brown">
          {t("guide.signIn.title")}
        </h1>
        <p className="mt-1.5 font-sans text-[13px] font-light leading-relaxed text-ink-body">
          {t("guide.signIn.body")}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Badge tone="outline">{t("guide.signIn.demoNote")}</Badge>
          {/*
            Screen 00 sends whoever picked the guide card here. Picking the
            wrong card is easy, and every guide tab lands back on this screen,
            so the way out is on it.
          */}
          <button
            onClick={() => {
              chooseRole("traveller");
              navigate("/explore");
            }}
            className="shrink-0 font-sans text-[12.5px] font-medium text-terracotta active:opacity-60"
          >
            {t("role.switchToTraveller")}
          </button>
        </div>
      </div>

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !roster ? (
        <Spinner label={t("common.loading")} />
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-[22px] pb-4">
          {roster.map((provider) => (
            <li key={provider.id}>
              <button
                onClick={() => signIn(provider.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-ivory p-3.5 text-start shadow-hairline active:bg-beige"
              >
                <Avatar name={provider.name} url={provider.photo_url} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[14.5px] font-medium text-brown">
                    {provider.name}
                  </p>
                  <p className="truncate font-sans text-xs font-light text-ink-muted">
                    {t(`advisors.${provider.role}`)} ·{" "}
                    {provider.languages.map((l) => l.toUpperCase()).join(" · ")}
                  </p>
                </div>
                {provider.verified ? (
                  <Badge tone="terracotta">{t("provider.verified")}</Badge>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
