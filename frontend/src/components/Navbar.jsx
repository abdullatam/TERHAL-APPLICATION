import { NavLink } from "react-router-dom";

import { useLanguage } from "../i18n/LanguageContext.jsx";

const LINKS = [
  { to: "/", key: "nav.planner" },
  { to: "/offers", key: "nav.bidding" },
  { to: "/camera-guide", key: "nav.cameraGuide" },
  { to: "/providers", key: "nav.providers" },
];

export default function Navbar() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <nav className="flex items-center justify-between bg-stone-900 px-6 py-4 text-white">
      <div className="flex gap-6">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? "font-semibold underline" : "opacity-80")}
          >
            {t(link.key)}
          </NavLink>
        ))}
      </div>
      <button
        className="rounded bg-stone-700 px-3 py-1 text-sm"
        onClick={() => setLanguage(language === "en" ? "ar" : "en")}
      >
        {language === "en" ? "العربية" : "English"}
      </button>
    </nav>
  );
}
