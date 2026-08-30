import { useState } from "react";

import { api } from "../api/client.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function CameraGuide() {
  const { t, language } = useLanguage();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("language", language);
      setResult(await api.identifyLandmark(formData));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("cameraGuide.title")}</h1>

      <label className="block w-fit cursor-pointer rounded bg-stone-900 px-4 py-2 text-white">
        {t("cameraGuide.upload")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </label>

      {loading && <p>Identifying…</p>}

      {result && (
        <div className="rounded border p-4">
          <div className="text-lg font-semibold">{result.landmark}</div>
          <p className="mt-2 text-stone-700">{result.narration}</p>
        </div>
      )}
    </div>
  );
}
