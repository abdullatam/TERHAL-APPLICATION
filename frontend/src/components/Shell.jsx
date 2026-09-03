import { NavLink, useLocation } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

/**
 * Terhal app shell. Rebuilt from the Claude Design export:
 *   - frame is 390px wide (the export's artboard), not the old 430px
 *   - Light Ivory screen on a Neutral Gray ground
 *   - 78px tab bar, 46px status bar, 26px home indicator
 *
 * Carried forward from the old shell, because the export does not show it:
 *   - the My Trip count badge
 *   - the Advisors tab staying lit on /advisors/:id, /bookings, /bookings/:id
 *   - the language toggle in the top bar
 */

const TABS = [
  { to: "/explore", key: "nav.explore", icon: CompassIcon },
  { to: "/trip", key: "nav.trip", icon: RouteIcon },
  { to: "/advisors", key: "nav.advisors", icon: AdvisorsIcon },
  { to: "/camera", key: "nav.camera", icon: CameraIcon },
  { to: "/chat", key: "nav.chat", icon: ChatIcon },
];

/**
 * Routes with no tab of their own, and the tab that should stay lit on them.
 * `/advisors/:id` is absent deliberately — NavLink prefix-matches `/advisors`
 * already, so it lights the right tab without help.
 */
const TAB_OWNERS = [
  { prefix: "/bookings", tab: "/advisors" },
  { prefix: "/marketplace", tab: "/advisors" },
  { prefix: "/passport", tab: "/trip" },
  { prefix: "/review", tab: "/trip" },
];

export function PhoneFrame({ children }) {
  return (
    // 100dvh, not 100%: mobile browser toolbars shrink the viewport as you
    // scroll, and a fixed bottom tab bar has to follow it.
    <div className="flex h-[100dvh] justify-center bg-gray">
      <div className="relative flex h-full w-full max-w-[390px] flex-col overflow-hidden bg-ivory shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/**
 * The export draws an iOS status bar on every artboard. It is chrome, not
 * content — so it renders only inside the laptop phone frame and is hidden on
 * a real device, where the actual OS bar sits there instead.
 */
export function StatusBar({ tone = "brown" }) {
  const color = tone === "ivory" ? "text-ivory" : "text-brown";
  return (
    <div
      aria-hidden="true"
      className={`h-[46px] shrink-0 items-center justify-between px-[26px] font-sans text-sm font-semibold ${color} hidden [@media(display-mode:browser)]:flex`}
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.6" y="5" width="3" height="6" rx="1" />
          <rect x="9.2" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.8" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".45" />
          <rect x="2.5" y="2.5" width="15" height="7" rx="2" fill="currentColor" />
          <path d="M23.4 4.3v3.4a2.2 2.2 0 0 0 0-3.4Z" fill="currentColor" opacity=".45" />
        </svg>
      </span>
    </div>
  );
}

export function HomeIndicator({ tone = "brown" }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-[26px] shrink-0 items-center justify-center pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className={`h-[5px] w-[134px] rounded-[3px] ${
          tone === "ivory" ? "bg-ivory opacity-75" : "bg-brown opacity-[.28]"
        }`}
      />
    </div>
  );
}

/**
 * Screen header. The export gives Explore and My Trip a brand-icon + title
 * row with a trailing square action button; that is this component's `action`
 * slot. The language toggle always sits at the trailing edge.
 */
export function TopBar({
  title,
  subtitle,
  action = null,
  onBack = null,
  showIcon = false,
}) {
  const { toggleLanguage, language, isRTL } = useLanguage();
  return (
    <header className="z-20 shrink-0 px-[22px] pb-3.5 pt-1">
      <div className="flex items-end justify-between gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label={language === "ar" ? "رجوع" : "Back"}
            className="-ms-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-brown active:bg-beige"
          >
            {/* Mirrors with the document direction. */}
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 rtl:-scale-x-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : null}

        {showIcon ? (
          <img
            src="/brand/terhal-icon.png"
            alt=""
            className="h-[26px] w-[26px] shrink-0 object-contain"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-sans text-2xl font-semibold leading-tight tracking-[-.01em] text-brown">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate font-sans text-[12.5px] font-light leading-tight text-ink-muted">
              {subtitle}
            </p>
          ) : null}
        </div>

        {action}

        <button
          onClick={toggleLanguage}
          lang={language === "en" ? "ar" : "en"}
          className={`shrink-0 rounded-xl bg-beige px-3 py-2 text-xs font-semibold text-brown active:bg-sandstone/40 ${
            language === "en" ? "font-arabic" : "font-sans"
          }`}
        >
          {language === "en" ? "عربي" : "EN"}
        </button>
      </div>
      {/* dir is set on <html>; this keeps the toggle honest in dev tools. */}
      <span className="hidden">{isRTL ? "rtl" : "ltr"}</span>
    </header>
  );
}

/** Square 38px action button used in the export's header rows. */
export function HeaderAction({ label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl bg-beige text-brown active:bg-sandstone/40"
    >
      {children}
    </button>
  );
}

export function TabBar() {
  const { t } = useLanguage();
  const { approved } = useTrip();
  const { pathname } = useLocation();

  const activeOverride =
    TAB_OWNERS.find((o) => pathname.startsWith(o.prefix))?.tab ?? null;

  return (
    <nav className="z-20 h-[78px] shrink-0 border-t border-gray bg-ivory">
      <ul className="grid h-full grid-cols-5 items-start px-2 pt-[11px]">
        {TABS.map(({ to, key, icon: Icon }) => {
          const forced = activeOverride === to;
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-[5px] ${
                    isActive || forced ? "text-terracotta" : "text-ink-soft"
                  }`
                }
              >
                <Icon />
                <span className="font-sans text-[10px] font-medium tracking-[.03em]">
                  {t(key)}
                </span>
                {/*
                  Not in the export, carried over from the old shell: the
                  count of places swiped right, so the tab tells you the plan
                  is waiting. Positioned with a logical `end` so it mirrors.
                */}
                {to === "/trip" && approved.length > 0 ? (
                  <span className="absolute end-[20%] top-0 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-terracotta px-1 font-sans text-[9px] font-bold text-ivory ring-2 ring-ivory">
                    {approved.length}
                  </span>
                ) : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------------------------------------------------------------------------
 * Tab icons, traced from the export: 24x24, stroke-only, 1.6 stroke width.
 * ------------------------------------------------------------------------- */

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.4 8.6 13.2 13.2 8.6 15.4 10.8 10.8Z" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="6.5" r="2.2" />
      <circle cx="18" cy="17.5" r="2.2" />
      <path d="M6 8.7v3.1c0 2 1.6 3.2 3.6 3.2h4.8" />
    </svg>
  );
}
function AdvisorsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M4 19c0-3 2.5-4.8 5.5-4.8S15 16 15 19" />
      <path d="M16 6.4a3 3 0 0 1 0 5.6M17.5 14.6c1.7.6 2.9 2 2.9 4.4" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 8.8h3.4L8 6.2h8l1.6 2.6H21v9.6H3z" />
      <circle cx="12" cy="13.4" r="3.3" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 12.6c0 3.4-3.6 6.2-8 6.2-1 0-2-.15-2.9-.42L4 20l1.5-3.3A6.6 6.6 0 0 1 4 12.6c0-3.4 3.6-6.2 8-6.2s8 2.8 8 6.2Z" />
    </svg>
  );
}
