import { NavLink, useLocation } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

const TABS = [
  { to: "/", key: "nav.explore", icon: CardsIcon },
  { to: "/trip", key: "nav.trip", icon: RouteIcon },
  { to: "/advisors", key: "nav.advisors", icon: PinIcon },
  { to: "/camera", key: "nav.camera", icon: CameraIcon },
  { to: "/chat", key: "nav.chat", icon: ChatIcon },
];

/**
 * The app is built as a phone screen. On a laptop it sits in a phone-shaped
 * frame rather than stretching across the window — judges see the product the
 * way a tourist would hold it.
 */
export function PhoneFrame({ children }) {
  return (
    // 100dvh, not 100%: mobile browser toolbars shrink the viewport as you
    // scroll, and a fixed bottom tab bar has to follow it.
    <div className="flex h-[100dvh] justify-center bg-sand-900">
      <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-sand-50 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function TopBar({ title, subtitle, right = null, onBack = null }) {
  const { toggleLanguage, language } = useLanguage();
  return (
    <header className="z-20 shrink-0 border-b border-sand-200 bg-sand-50/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="-ms-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sand-600 active:bg-sand-100"
          >
            {/* Mirrors with the document direction. */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight text-sand-900">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs leading-tight text-sand-500">{subtitle}</p>
          ) : null}
        </div>
        {right}
        <button
          onClick={toggleLanguage}
          className="shrink-0 rounded-full border border-sand-300 px-3 py-1.5 text-xs font-semibold text-sand-700 active:bg-sand-100"
        >
          {language === "en" ? "عربي" : "EN"}
        </button>
      </div>
    </header>
  );
}

export function TabBar() {
  const { t } = useLanguage();
  const { approved } = useTrip();
  const { pathname } = useLocation();

  // The booking screens belong to the advisor flow; keep that tab lit.
  const activeOverride = pathname.startsWith("/advisor") || pathname.startsWith("/booking")
    ? "/advisors"
    : null;

  return (
    <nav className="z-20 shrink-0 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex">
        {TABS.map(({ to, key, icon: Icon }) => {
          const forced = activeOverride === to;
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                    isActive || forced ? "text-rose-500" : "text-sand-500"
                  }`
                }
              >
                <Icon />
                <span>{t(key)}</span>
                {to === "/trip" && approved.length > 0 ? (
                  <span className="absolute end-[22%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
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

const iconProps = {
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
};

function CardsIcon() {
  return (
    <svg {...iconProps}>
      <rect x="7" y="4" width="12" height="16" rx="2" />
      <path d="M4 7v10a2 2 0 0 0 1 1.7" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}
