import { NavLink, useLocation } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useGuide } from "../state/GuideContext.jsx";

/**
 * The guide side's own shell — a separate component from the tourist
 * `Shell.jsx` on purpose. Different user, different navigation. It shares the
 * brand tokens, typography, radii and icon style, because this is one product
 * with two surfaces and visual drift between them would read as two products.
 *
 * The export's tab bar has FIVE tabs, not six: Offerings is not a tab, it
 * nests under Profile.
 */

const TABS = [
  { to: "/guide", key: "guide.nav.today", icon: ClockIcon, end: true },
  { to: "/guide/requests", key: "guide.nav.requests", icon: InboxIcon },
  { to: "/guide/calendar", key: "guide.nav.calendar", icon: CalendarIcon },
  { to: "/guide/earnings", key: "guide.nav.earnings", icon: BarsIcon },
  { to: "/guide/profile", key: "guide.nav.profile", icon: PersonIcon },
];

/** Offerings has no tab of its own, so Profile stays lit there. */
const TAB_OWNERS = [{ prefix: "/guide/offerings", tab: "/guide/profile" }];

export function GuideTabBar() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  // One call: the badge count lives in GuideContext, so the shell does no
  // data loading of its own.
  const { providerId, pendingCount: pending } = useGuide();

  const activeOverride = TAB_OWNERS.find((o) => pathname.startsWith(o.prefix))?.tab ?? null;

  if (!providerId) return null; // no shell until an identity is chosen

  return (
    <nav className="z-20 h-[78px] shrink-0 border-t border-gray bg-ivory">
      <ul className="grid h-full grid-cols-5 items-start px-2 pt-[11px]">
        {TABS.map(({ to, key, icon: Icon, end }) => {
          const forced = activeOverride === to;
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
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
                {to === "/guide/requests" && pending > 0 ? (
                  <span className="absolute end-[18%] top-0 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-terracotta px-1 font-sans text-[9px] font-bold text-ivory ring-2 ring-ivory">
                    {pending}
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

/**
 * Guide screen header. The export gives these screens a plain title row with
 * an optional trailing action, and no back chevron — the tab bar is the
 * navigation. The language toggle stays, because a Ma'an guide is more likely
 * to want Arabic than a visitor is.
 */
export function GuideTopBar({ title, subtitle, action = null, greeting = null }) {
  const { toggleLanguage, language } = useLanguage();
  return (
    <header className="z-20 shrink-0 px-[22px] pb-3.5 pt-1">
      {greeting ? (
        <p className="font-sans text-xs font-light text-ink-muted">{greeting}</p>
      ) : null}
      <div className="flex items-end justify-between gap-3">
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
    </header>
  );
}

/* --- tab icons, traced from GuideTabBar.dc.html: 24x24, stroke 1.6 ------- */

const ico = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function ClockIcon() {
  return (
    <svg {...ico}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4V12l3 1.8" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg {...ico}>
      <path d="M4 7.5 12 13l8-5.5" />
      <rect x="4" y="5.5" width="16" height="13" rx="2.6" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...ico}>
      <rect x="4" y="5.5" width="16" height="14" rx="2.8" />
      <path d="M4 10h16M8.5 3.6v3.8M15.5 3.6v3.8" />
    </svg>
  );
}
function BarsIcon() {
  return (
    <svg {...ico}>
      <path d="M5 18V11M12 18V6.5M19 18v-4.5" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg {...ico}>
      <circle cx="12" cy="8.6" r="3.4" />
      <path d="M5.5 19.4c0-3.3 2.9-5.2 6.5-5.2s6.5 1.9 6.5 5.2" />
    </svg>
  );
}
