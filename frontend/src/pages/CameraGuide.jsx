import { useRef, useState } from "react";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { PrimaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Camera guide — screen 16. The export frames the shot with corner brackets
 * and puts the narration on a beige card with a listen control. Capture,
 * upload, the vision call and speech synthesis are carried over unchanged.
 */
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
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar title={t("camera.title")} subtitle={t("camera.subtitle")} showIcon />

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-4">
        {/* Viewfinder: brackets on a hatched ground, or the captured frame. */}
        <div className="relative mb-4 h-[280px] overflow-hidden rounded-frame bg-hatch">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : null}
          <Brackets />
          {!preview ? (
            <span className="absolute inset-x-0 bottom-4 text-center font-mono text-[10px] tracking-[.16em] text-ink-stamp">
              {t("camera.subtitle")}
            </span>
          ) : null}
        </div>

        {loading ? <Spinner label={t("camera.identifying")} /> : null}

        {error ? (
          <p className="rounded-2xl bg-beige p-4 font-sans text-sm text-brown">{error}</p>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-2xl bg-beige p-4">
            <h2 className="font-sans text-lg font-semibold text-brown">{result.landmark}</h2>
            <p className="font-sans text-sm font-light leading-relaxed text-ink-body">
              {result.narration}
            </p>
            {"speechSynthesis" in window ? (
              <button
                onClick={() => (speaking ? stop() : speak(result.narration))}
                className="inline-flex items-center gap-2 rounded-full bg-terracotta px-3.5 py-2 font-sans text-xs font-semibold text-ivory active:opacity-80"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {speaking ? (
                    <path d="M6 6h4v12H6zM14 6h4v12h-4z" />
                  ) : (
                    <path d="M11 5L6 9H3v6h3l5 4V5zM16 9a4 4 0 0 1 0 6" />
                  )}
                </svg>
                {speaking ? t("camera.stop") : t("camera.listen")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 border-t border-gray bg-ivory p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <PrimaryButton onClick={() => inputRef.current?.click()} disabled={loading}>
          {result || error ? t("camera.again") : t("camera.upload")}
        </PrimaryButton>
        {result || preview ? (
          <button
            onClick={reset}
            className="w-full text-center font-sans text-xs font-semibold text-ink-soft"
          >
            {t("common.close")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Corner brackets, per the export's FRAME treatment. */
function Brackets() {
  const corner =
    "absolute h-7 w-7 border-ivory/80";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-4">
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2 rounded-tl-lg`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2 rounded-tr-lg`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg`} />
    </div>
  );
}
