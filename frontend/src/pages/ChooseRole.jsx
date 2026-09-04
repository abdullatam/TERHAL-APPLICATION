import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { HomeIndicator, StatusBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useOnboarding } from "../state/OnboardingContext.jsx";

/**
 * Choose Role — screen 00, the step between the onboarding slides and the app
 * itself. Rebuilt from the "00 Choose Role" artboard: beige header band with
 * the ridge wash, two selectable cards, the verification note, and a Continue
 * whose label names the side you picked.
 *
 * Terhal is two apps in one build. Until now the provider half was reachable
 * only by typing /guide, which is fine for a demo and wrong for a product:
 * the two audiences are told apart at the door, and the choice decides where
 * Continue lands — /explore for a traveller, /guide for a guide.
 *
 * The choice is remembered (OnboardingContext), so the splash sends a
 * returning visitor back to their own side rather than asking again. It is not
 * a commitment: both profiles carry a row that switches sides, which is what
 * the subtitle here promises.
 *
 * The artboard's "Already have an account? Sign in" row is kept, because the
 * absence of accounts is worth saying out loud rather than hiding — tapping it
 * says so. There is no auth on either surface (PROJECT.md §5), and the guide
 * side asks which seeded advisor to act as once you get there.
 */
const ROLES = [
  { id: "traveller", destination: "/explore", Icon: CompassIcon },
  { id: "guide", destination: "/guide", Icon: RidgeIcon },
];

const TAGS = ["tag1", "tag2", "tag3"];

export default function ChooseRole() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role: remembered, chooseRole } = useOnboarding();
  const { toast } = useToast();

  // The artboard opens with the traveller card already selected — most people
  // here are travellers, and an empty state would put a dead Continue on
  // screen. A remembered choice wins, for anyone coming back through Profile.
  const [selected, setSelected] = useState(
    ROLES.some((r) => r.id === remembered) ? remembered : "traveller",
  );

  const chosen = ROLES.find((r) => r.id === selected);

  const go = () => {
    chooseRole(chosen.id);
    navigate(chosen.destination, { replace: true });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ivory">
      <StatusBar />

      {/* Beige header band with the ridge wash, as on Profile. */}
      <div className="relative shrink-0 overflow-hidden bg-beige px-[26px] pb-[26px] pt-[22px]">
        <svg
          viewBox="0 0 390 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[120px] w-full opacity-40"
          fill="none"
        >
          <path d="M0 100 82 46l48 30 56-40 64 48 50-26 90 54v18H0Z" fill="#D9B28C" />
        </svg>

        <div className="relative flex flex-col gap-3.5">
          <img
            src="/brand/terhal-lockup.png"
            alt="Terhal"
            className="block h-auto w-[118px] object-contain"
          />
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-sans text-[27px] font-semibold leading-[1.2] tracking-[-.015em] text-brown">
              {t("role.title")}
            </h1>
            <p className="m-0 font-sans text-[13.5px] font-light leading-[1.55] text-ink-muted">
              {t("role.body")}
            </p>
          </div>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={t("role.title")}
        className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] pt-5"
      >
        {ROLES.map(({ id, Icon }) => (
          <RoleCard
            key={id}
            id={id}
            Icon={Icon}
            selected={selected === id}
            onSelect={() => setSelected(id)}
          />
        ))}

        {/* Why a guide does not go live the moment they tap Continue. */}
        <div className="mt-0.5 flex items-center gap-[11px] rounded-2xl bg-beige px-[15px] py-[13px]">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] bg-terracotta/[.14]">
            <img
              src="/brand/terhal-icon.png"
              alt=""
              className="h-[17px] w-[17px] object-contain"
            />
          </span>
          <p className="m-0 font-sans text-xs leading-[1.45] text-brown">
            {t("role.note")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 px-[22px] pb-2.5 pt-4">
        <button
          onClick={go}
          className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-terracotta px-5 font-sans text-[15px] font-semibold text-ivory transition active:scale-[0.98]"
        >
          {t(`role.continue.${selected}`)}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rtl:-scale-x-100"
          >
            <path d="M5 12h13M12.5 6.5 19 12l-6.5 5.5" />
          </svg>
        </button>

        <div className="flex items-center justify-center gap-1.5">
          <span className="font-sans text-[12.5px] font-light text-ink-muted">
            {t("role.haveAccount")}
          </span>
          <button
            onClick={() =>
              toast({ title: t("profile.notInBuild"), body: t("role.signInNote") })
            }
            className="rounded-full px-1 font-sans text-[12.5px] font-medium text-terracotta active:opacity-60"
          >
            {t("role.signIn")}
          </button>
        </div>
      </div>

      <HomeIndicator />
    </div>
  );
}

/**
 * One side of the door. A real radio rather than a link: the artboard shows
 * the selection driving the Continue label, so choosing and committing are two
 * separate taps and the pair can be walked with a keyboard.
 */
function RoleCard({ id, Icon, selected, onSelect }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative flex flex-col overflow-hidden rounded-[20px] bg-ivory text-start transition ${
        selected ? "shadow-[0_0_0_2px_#B2543A]" : "shadow-hairline"
      }`}
    >
      {/* The artboard's radio dot, in the trailing corner so it mirrors. */}
      <span
        aria-hidden="true"
        className={`absolute end-3.5 top-3.5 grid h-6 w-6 place-items-center rounded-full ${
          selected ? "bg-terracotta" : "shadow-[inset_0_0_0_1.5px_#D9C7B3]"
        }`}
      >
        {selected ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FAF6F2"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : null}
      </span>

      <div className="flex items-start gap-3.5 p-[18px] pb-4">
        <span
          className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-2xl ${
            selected ? "bg-terracotta/[.12] text-terracotta" : "bg-beige text-ink-body"
          }`}
        >
          <Icon />
        </span>
        <span className="flex flex-1 flex-col gap-1 pe-6">
          <span className="font-sans text-[17px] font-semibold text-brown">
            {t(`role.${id}.title`)}
          </span>
          <span className="font-sans text-[12.5px] font-light leading-[1.5] text-ink-muted">
            {t(`role.${id}.body`)}
          </span>
        </span>
      </div>

      <span className="flex flex-wrap gap-[7px] px-[18px] pb-4">
        {TAGS.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-beige px-[11px] py-1.5 font-sans text-[11.5px] text-ink-body"
          >
            {t(`role.${id}.${tag}`)}
          </span>
        ))}
      </span>
    </button>
  );
}

const iconProps = {
  width: 25,
  height: 25,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** The Explore tab's compass — the traveller side, named by its own icon. */
function CompassIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.4 8.6 13.2 13.2 8.6 15.4 10.8 10.8Z" />
    </svg>
  );
}

/** The ridge line from the artboard: the country a guide walks you through. */
function RidgeIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M3 13.5 6.5 10l3 2.5 3-2.5 3 2.5L21 10" />
      <path d="M4.5 15.5c2 2.6 4.6 4 7.5 4s5.5-1.4 7.5-4" />
    </svg>
  );
}
