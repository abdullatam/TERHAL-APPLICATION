import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function ProviderDirectory() {
  const { t } = useLanguage();
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    api.listProviders().then(setProviders);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("providers.title")}</h1>

      <ul className="space-y-2">
        {providers.map((p) => (
          <li key={p.id} className="rounded border p-3">
            <div className="flex items-center gap-2 font-semibold">
              {p.name}
              {p.verified && <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Verified</span>}
              {p.welfare_compliant && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Welfare-compliant</span>
              )}
            </div>
            <div className="text-sm text-stone-600">
              {p.role} · rating {p.rating} · attractions: {p.landmark_ids.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
