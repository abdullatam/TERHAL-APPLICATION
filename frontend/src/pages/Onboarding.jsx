import { useEffect, useState } from "react";
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
 *
 * The heroes are the real self-hosted photographs from data/landmark_images.csv
 * (served at /images/<id>/<n>.jpg), each picked to argue its own slide: a ruin
 * nobody routes you to, a walk with the scale of the place in it, and the town
 * the guides go home to. They also run daylight → gold → dusk, so the three
 * read as a sequence. Each is CC BY or CC BY-SA, so the credit rides along with
 * the picture — verbatim from that CSV, as the landmark gallery does.
 */
const STEPS = [1, 2, 3];

/**
 * Per slide: which photograph, where to hold the crop, and its credit.
 *
 * `focus` matters more than usual here. The frame is near-square and two of the
 * three photographs are tall, so a default centre crop would cut exactly the
 * part that carries the meaning — the walking figures that give the Siq its
 * scale. These positions keep the subject in frame.
 *
 * Slide 3's artboard pinned "Ammarin Camp". There is no free-licensed photo of
 * that camp in the library, and captioning some other place as the camp is the
 * one thing the image-sourcing pass consistently refused to do, so the pin
 * names what is actually pictured — Wadi Musa, which is where the advisors the
 * slide is about live anyway.
 */
const SLIDES = {
  1: {
    src: "/images/WUA/1.jpg",
    focus: "object-[58%_52%]",
    credit: "Photo by Bashar Tabbah, CC BY-SA 4.0, via Wikimedia Commons",
  },
  2: {
    src: "/images/PET-SIQ/2.jpg",
    focus: "object-[50%_68%]",
    credit: "Photo by Diego Delso, CC BY-SA 3.0, via Wikimedia Commons",
  },
  3: {
    src: "/images/WMU/3.jpg",
    focus: "object-center",
    credit: "Photo by Jorge Láscar, CC BY 2.0, via Wikimedia Commons",
  },
};

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

      <Hero step={step} />

      <div className="flex flex-1 flex-col gap-4 px-[30px] pt-[26px]">
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

/**
 * The photographic hero. Three things earn their place on top of the picture:
 * the artboard's location pin, a fade into the ivory page so the crop does not
 * end on a hard edge, and the credit the licence requires.
 *
 * The photo comes from the API host, so a demo with the backend down would
 * otherwise open on a broken image. `failed` puts the hatch placeholder back
 * instead — the same one the rest of the app uses for a place with no photo.
 */
function Hero({ step }) {
  const { t } = useLanguage();
  const { src, focus, credit } = SLIDES[step];
  const [failed, setFailed] = useState(false);

  // Fetch the next slide's photo now, so Next does not land on an empty frame.
  useEffect(() => {
    const upcoming = SLIDES[step + 1];
    if (!upcoming) return;
    const img = new Image();
    img.src = upcoming.src;
  }, [step]);

  return (
    <figure className="m-0 shrink-0">
      <div
        className={`relative h-[396px] overflow-hidden bg-hatch ${HERO_ROUNDING[step]}`}
      >
        {failed ? (
          // h-full, not absolute: PhotoPlaceholder sets `relative` on itself,
          // and Tailwind emits .relative after .absolute, so a passed
          // `absolute` loses and the box collapses — taking its label with it.
          <PhotoPlaceholder
            label={t(`onboarding.${step}.photo`)}
            className="h-full w-full"
          />
        ) : (
          <img
            key={src}
            src={src}
            alt={t(`onboarding.${step}.alt`)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover ${focus}`}
          />
        )}

        <span className="absolute start-[22px] top-5 flex items-center gap-2.5 rounded-full bg-ivory/[.92] py-[7px] pe-3.5 ps-2.5 shadow-hairline backdrop-blur-sm">
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
      </div>

      {/*
        Under the photo, not on it. On the photo the credit either truncates
        against the pin, sits over slide 2's walkers, or runs into the corner
        slide 3 is cut on — and a truncated credit is not a credit.
      */}
      {!failed ? (
        <figcaption className="px-[30px] pt-[7px] text-end font-sans text-[9.5px] font-light leading-none text-ink-soft">
          {credit}
        </figcaption>
      ) : null}
    </figure>
  );
}
