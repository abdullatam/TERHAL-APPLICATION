import { useNavigate, useParams } from "react-router-dom";

import { HomeIndicator, StatusBar } from "../components/Shell.jsx";
import { Eyebrow, GhostButton, PhotoPlaceholder, PrimaryButton } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useOnboarding } from "../state/OnboardingContext.jsx";

/**
 * Onboarding — screens 02, 03 and 04. One component, three steps: the
 * artboards differ only in copy, the corner the hero is cut on, and which
 * progress bar is filled.
 *
 * The export prints its Arabic subtitle beneath the English heading on every
 * slide. In Arabic mode the pair flips, so the Arabic leads and English sits
 * under it — the slide always shows both, whichever way round.
 */
const STEPS = [1, 2, 3];

// Each hero is cut on a different corner, so the three slides do not read as
// the same picture with new words.
const HERO_ROUNDING = {
  1: "rounded-bl-[72px]",
  2: "rounded-br-[72px]",
  3: "rounded-bl-[72px] rounded-tr-[72px]",
};

export default function Onboarding() {
  const { step: rawStep } = useParams();
  const navigate = useNavigate();
  const { t, tIn, language } = useLanguage();
  const { complete } = useOnboarding();

  const step = STEPS.includes(Number(rawStep)) ? Number(rawStep) : 1;
  const isLast = step === STEPS.length;

  const finish = () => {
    complete();
    navigate("/explore", { replace: true });
  };
  const next = () => (isLast ? finish() : navigate(`/welcome/${step + 1}`));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ivory">
      <StatusBar />

      <div
        className={`relative h-[396px] shrink-0 overflow-hidden bg-hatch ${HERO_ROUNDING[step]}`}
      >
        {/* Ridge wash, tinted terracotta. */}
        <svg
          viewBox="0 0 390 130"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[130px] w-full"
          fill="none"
        >
          <path
            d="M0 108 84 44l50 38 58-52 70 62 50-32 78 54v66H0Z"
            fill="#B2543A"
            opacity=".28"
          />
        </svg>

        <span className="absolute start-[22px] top-5 flex items-center gap-2.5 rounded-full bg-ivory/[.92] py-[7px] pe-3.5 ps-2.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#B2543A"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s7-6.7 7-11.3A7 7 0 0 0 5 9.7C5 14.3 12 21 12 21Z" />
            <circle cx="12" cy="9.6" r="2.4" />
          </svg>
          <span className="font-sans text-xs font-medium text-brown">
            {t(`onboarding.${step}.pin`)}
          </span>
        </span>

        <PhotoPlaceholder
          label={t(`onboarding.${step}.photo`)}
          className="absolute inset-0 -z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-[30px] pt-[38px]">
        <Eyebrow>{t(`onboarding.${step}.eyebrow`)}</Eyebrow>
        <h2 className="m-0 font-sans text-[34px] font-semibold leading-[1.12] tracking-[-.02em] text-brown">
          {t(`onboarding.${step}.title`)}
        </h2>
        {/* The other language's title, always shown, per the export. */}
        <p
          dir={language === "ar" ? "ltr" : "rtl"}
          className={`m-0 text-[17px] text-terracotta ${
            language === "ar" ? "font-sans" : "font-arabic"
          }`}
        >
          {tIn(language === "ar" ? "en" : "ar", `onboarding.${step}.title`)}
        </p>
        <p className="m-0 font-sans text-[15px] font-light leading-[1.65] text-ink-body">
          {t(`onboarding.${step}.body`)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-[22px] px-[30px] pb-[26px]">
        <div className="flex items-center gap-[7px]" aria-hidden="true">
          {STEPS.map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-[3px] transition-all ${
                n === step ? "w-[26px] bg-terracotta" : "w-1.5 bg-sandstone"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3.5">
          <GhostButton onClick={finish}>{t("onboarding.skip")}</GhostButton>
          <PrimaryButton onClick={next}>
            {isLast ? t("onboarding.start") : t("onboarding.next")}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:-scale-x-100"
            >
              <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
            </svg>
          </PrimaryButton>
        </div>
      </div>

      <HomeIndicator />
    </div>
  );
}
