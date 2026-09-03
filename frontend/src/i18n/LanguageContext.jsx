import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import ar from "./ar.json";
import en from "./en.json";

const DICTIONARIES = { en, ar };
const STORAGE_KEY = "maan.language";
const LanguageContext = createContext(null);

function stored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "ar" || value === "en" ? value : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(stored);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Private browsing: the toggle still works for this session.
    }
  }, [language]);

  const value = useMemo(() => {
    const dict = DICTIONARIES[language];
    return {
      language,
      isRTL: language === "ar",
      setLanguage,
      toggleLanguage: () => setLanguage((l) => (l === "en" ? "ar" : "en")),
      // t("explore.remaining", { n: 4 }) -> "4 left"
      t: (key, vars) => {
        const template = dict[key] ?? key;
        if (!vars) return template;
        return Object.entries(vars).reduce(
          (out, [name, val]) => out.replaceAll(`{${name}}`, String(val)),
          template,
        );
      },
      // Landmarks and advisors carry both languages on the same record.
      pick: (record, field) =>
        record?.[`${field}_${language}`] ?? record?.[`${field}_en`] ?? "",
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}

export function useFormatDuration() {
  const { t } = useLanguage();
  return useCallback(
    (minutes) => {
      if (!minutes) return "";
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      if (!hours) return t("common.minutes", { n: rest });
      if (!rest) return t("common.hours", { n: hours });
      return t("common.hoursMinutes", { h: hours, m: rest });
    },
    [t],
  );
}
