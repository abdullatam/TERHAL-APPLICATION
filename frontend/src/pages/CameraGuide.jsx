import { useRef, useState } from "react";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import { SecondaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function CameraGuide() {
  const { t, language } = useLanguage();
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("language", language);
      setResult(await api.identifyLandmark(formData));
    } catch (err) {
      setError(err.message || t("camera.failed"));
    } finally {
      setLoading(false);
      event.target.value = ""; // allow re-picking the same file
    }
  };

  // The feature is pitched as a guide that *talks*, so let it talk.
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ar" ? "ar-JO" : "en-GB";
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const reset = () => {
    stop();
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={t("camera.title")} subtitle={t("camera.subtitle")} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {preview ? (
          <img src={preview} alt="" className="mb-4 h-56 w-full rounded-2xl object-cover" />
        ) : (
          <div className="mb-4 flex h-56 items-center justify-center rounded-2xl border-2 border-dashed border-sand-300 bg-white">
            <svg viewBox="0 0 24 24" className="h-12 w-12 text-sand-300" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </div>
        )}

        {loading ? <Spinner label={t("camera.identifying")} /> : null}

        {error ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4">
            <h2 className="text-lg font-bold text-sand-900">{result.landmark}</h2>
            <p className="text-sm leading-relaxed text-sand-700">{result.narration}</p>
            {"speechSynthesis" in window ? (
              <button
                onClick={() => (speaking ? stop() : speak(result.narration))}
                className="inline-flex items-center gap-2 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-sand-700"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {speaking ? <path d="M6 6h4v12H6zM14 6h4v12h-4z" /> : <path d="M11 5L6 9H3v6h3l5 4V5zM16 9a4 4 0 0 1 0 6" />}
                </svg>
                {speaking ? "■" : "▶"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-sand-200 bg-white p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <SecondaryButton onClick={() => inputRef.current?.click()} disabled={loading}>
          {result || error ? t("camera.again") : t("camera.upload")}
        </SecondaryButton>
        {result || preview ? (
          <button
            onClick={reset}
            className="mt-2 w-full text-center text-xs font-semibold text-sand-500"
          >
            {t("common.close")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
