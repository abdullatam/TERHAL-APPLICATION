import { createContext, useContext, useEffect, useMemo, useState } from "react";

import ar from "./ar.json";
import en from "./en.json";

const DICTIONARIES = { en, ar };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo(() => {
    const dict = DICTIONARIES[language];
    return {
      language,
      setLanguage,
      t: (key) => dict[key] ?? key,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
