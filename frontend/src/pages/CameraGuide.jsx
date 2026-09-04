import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";
import { goldenHour } from "../utils/sun.js";

/**
 * Camera guide — screen 16.
 *
 * A live-feeling viewfinder with the results sheet lifting over it. Rebuilt
 * from the export at `16 Camera Guide.dc.html`, which replaced the earlier
 * light-themed version of this screen.
 *
 * The export puts the status bar and header on the same near-black ground as
 * the viewfinder. They use the app's ivory chrome instead, so the top of the
 * screen matches every other tab; the dark treatment stops at the viewfinder,
 * which is the only part of the screen that is meant to read as a camera.
 *
 * What the model actually decides, rather than what the artboard hard-codes:
 * the name, the Arabic name, the subtitle, the narration, the framing tip and
 * the confidence percentage in the MATCHED pill all come back from
 * `POST /vision/identify`. The three-way switch sends a different `mode`, so
 * "Best frame" and "Read sign" are separate real questions, not filters over
 * one answer.
 *
 * Two controls in the artboard have nothing behind them and say so instead of
 * pretending (the same treatment as the unbuilt rows on Profile): flash, which
 * a web page cannot reach through the OS photo picker, and the bookmark, since
 * the app has no favourites. The grid toggle, the golden-hour chip, Listen,
 * Add to My Trip and Ask are all real.
 */

/** The switch positions, in the artboard's order. */
const MODES = [
  { id: "identify", key: "camera.mode.identify" },
  { id: "frame", key: "camera.mode.frame" },
  { id: "sign", key: "camera.mode.sign" },
];

/** The waveform's 12 bars: six colours in pairs, staggered by 100ms. */
const WAVE_BARS = [600, 600, 500, 500, 400, 400, 300, 300, 200, 200, 100, 100];
/** The resting profile, so a paused waveform is not a flat rule. */
const WAVE_REST = [0.5, 0.85, 0.4, 1, 0.6, 0.75, 0.35, 0.9, 0.5, 0.65, 0.4, 0.55];
const WAVE_COLOUR = {
  100: "bg-wave-100",
  200: "bg-wave-200",
  300: "bg-wave-300",
  400: "bg-wave-400",
  500: "bg-wave-500",
  600: "bg-wave-600",
};

export default function CameraGuide() {
  const navigate = useNavigate();
  const { t, pick, language, toggleLanguage } = useLanguage();
  const { toast } = useToast();
  const { approve, approved } = useTrip();

  const [mode, setMode] = useState("identify");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [grid, setGrid] = useState(true);
  const [tripLandmark, setTripLandmark] = useState(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Revoke the object URL when it is replaced, or the tab leaks a blob per shot.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  // Speech has to stop when the screen goes away; it does not stop itself.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const identify = async (file, nextMode = mode) => {
    setResult(null);
    setError(null);
    setLoading(true);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setTripLandmark(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("language", language);
      formData.append("mode", nextMode);
      const identified = await api.identifyLandmark(formData);
      setResult(identified);
      // "Add to My Trip" needs the whole landmark, not just an id: the trip
      // and the timeline render its name, hours and photos.
      if (identified.add_to_trip_id) {
        api
          .landmark(identified.add_to_trip_id)
          .then(setTripLandmark)
          .catch(() => setTripLandmark(null));
      }
    } catch (err) {
      setError(err.message || t("camera.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // so re-picking the same file still fires
    if (!file) return;
    fileRef.current = file;
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    identify(file);
  };

  // Switching mode re-asks about the photo already in the frame, rather than
  // making you shoot the same facade three times.
  const chooseMode = (next) => {
    if (next === mode) return;
    setMode(next);
    if (fileRef.current) identify(fileRef.current, next);
  };

  // Re-asking in the other language means re-asking the model: the narration
  // is generated, so there is no second translation of it lying around.
  const switchLanguage = () => {
    toggleLanguage();
    if (fileRef.current) {
      // The context's language has not committed yet on this tick, so send the
      // one we are switching to.
      const next = language === "ar" ? "en" : "ar";
      const formData = new FormData();
      formData.append("image", fileRef.current);
      formData.append("language", next);
      formData.append("mode", mode);
      setLoading(true);
      setResult(null);
      api
        .identifyLandmark(formData)
        .then(setResult)
        .catch((err) => setError(err.message || t("camera.failed")))
        .finally(() => setLoading(false));
    }
  };

  const speak = () => {
    if (!result?.narration || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result.narration);
    utterance.lang = language === "ar" ? "ar-JO" : "en-GB";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    } else {
      speak();
    }
  };

  const notBuilt = (labelKey) =>
    toast({ title: t(labelKey), body: t("camera.notBuiltBody") });

  const inTrip = tripLandmark && approved.some((l) => l.id === tripLandmark.id);
  const addToTrip = () => {
    if (!tripLandmark || inTrip) return;
    approve(tripLandmark);
    toast({
      title: t("camera.added", { name: pick(tripLandmark, "name") }),
      action: { label: t("nav.trip"), onPress: () => navigate("/trip") },
    });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-ivory">
      <StatusBar />

      {/* ---- header ---- */}
      <header className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-0.5">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige active:bg-sandstone/40"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[19px] w-[19px] text-brown rtl:-scale-x-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 6.5 8.5 12 14 17.5" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate font-sans text-[17px] font-semibold text-brown">
            {t("camera.title")}
          </span>
          <span className="line-clamp-2 font-sans text-[11.5px] font-light leading-tight text-ink-muted">
            {t("camera.subtitle")}
          </span>
        </div>
        <button
          onClick={switchLanguage}
          className="shrink-0 rounded-xl bg-beige px-[13px] py-2 text-xs font-medium text-brown active:bg-sandstone/40"
        >
          <span dir={language === "ar" ? "ltr" : "rtl"} className={otherFont(language)}>
            {language === "ar" ? "EN" : "عربي"}
          </span>
        </button>
        {/*
          The artboard's star. There is no favourites feature on either side of
          the app, so it reports that rather than looking like it saved.
        */}
        <button
          onClick={() => notBuilt("camera.favourite")}
          aria-label={t("camera.favourite")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-beige opacity-60 active:bg-sandstone/40"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px] text-brown"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3.5 13.6 8h4.6l-3.7 2.8 1.4 4.5-3.9-2.7-3.9 2.7 1.4-4.5L5.8 8h4.6Z" />
            <path d="M7 20.5h10" />
          </svg>
        </button>
      </header>

      {/* ---- viewfinder ---- */}
      <div className="relative min-h-[200px] flex-1 overflow-hidden bg-viewfinder">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div aria-hidden="true" className="absolute inset-0 bg-viewfinder-vignette" />

        {grid ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 390 340"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full opacity-[.16]"
            fill="none"
            stroke="#FAF6F2"
            strokeWidth="1"
          >
            <path d="M130 0v340M260 0v340M0 113h390M0 227h390" />
          </svg>
        ) : null}

        {/*
          Brackets: 79px inset each side, so they need no RTL mirroring. The
          export fixes the height at 292px, which only fits its own artboard —
          `inset-y` keeps all four corners on screen at any viewfinder height.
        */}
        <div className="absolute inset-y-[22px] start-[79px] w-[232px]">
          <Corner className="start-0 top-0 rounded-ss-xl border-s-[2.5px] border-t-[2.5px]" />
          <Corner className="end-0 top-0 rounded-se-xl border-e-[2.5px] border-t-[2.5px]" />
          <Corner className="bottom-0 start-0 rounded-es-xl border-b-[2.5px] border-s-[2.5px]" />
          <Corner className="bottom-0 end-0 rounded-ee-xl border-b-[2.5px] border-e-[2.5px]" />

          {/* The sweep only runs while the model is actually looking. */}
          {loading ? (
            <div
              aria-hidden="true"
              className="absolute inset-x-1.5 top-0 h-0.5 animate-sweep rounded-sm bg-sweep shadow-sweep"
            />
          ) : null}

          <MatchPill loading={loading} result={result} error={error} />
        </div>

        <GoldenHourChip />

        {/* Flash and grid, per the artboard's two stacked buttons. */}
        <div className="absolute end-5 top-5 flex flex-col gap-[9px]">
          <GlassButton
            label={t("camera.flash")}
            onClick={() => notBuilt("camera.flash")}
            className="opacity-60"
          >
            <path d="M13 3 6.5 13.2h4.2L10 21l7-10.5h-4.3Z" />
          </GlassButton>
          <GlassButton
            label={t("camera.grid")}
            onClick={() => setGrid((g) => !g)}
            pressed={grid}
          >
            <path d="M4 9V6.5A1.5 1.5 0 0 1 5.5 5H8M16 5h2.5A1.5 1.5 0 0 1 20 6.5V9M20 15v2.5A1.5 1.5 0 0 1 18.5 19H16M8 19H5.5A1.5 1.5 0 0 1 4 17.5V15" />
          </GlassButton>
        </div>

        {result?.framing_tip ? (
          <div className="absolute bottom-[30px] start-5 flex max-w-[74%] items-center gap-[9px] rounded-xl bg-night/55 px-[13px] py-[9px] backdrop-blur-lg">
            <svg
              viewBox="0 0 24 24"
              className="h-[15px] w-[15px] shrink-0 text-glow"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 11v6M12 7.2v.3" />
              <circle cx="12" cy="12" r="8.6" />
            </svg>
            <span className="line-clamp-2 font-sans text-[11.5px] font-normal leading-snug text-ivory/[.92]">
              {result.framing_tip}
            </span>
          </div>
        ) : null}
      </div>

      {/* ---- results sheet ---- */}
      <div className="relative z-10 -mt-[22px] flex min-h-0 flex-col gap-[13px] overflow-hidden rounded-t-[26px] bg-ivory px-5 pb-3.5 pt-[11px] shadow-sheet">
        <div aria-hidden="true" className="h-1 w-[38px] shrink-0 self-center rounded-[3px] bg-handle" />

        <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[13px] overflow-y-auto">
        <Headline
          loading={loading}
          error={error}
          result={result}
          hasPhoto={Boolean(preview)}
          mode={mode}
        />

        {result?.narration ? (
          <p className="no-scrollbar m-0 max-h-[84px] overflow-y-auto font-sans text-[13px] font-light leading-[1.6] text-ink-body">
            {result.narration}
          </p>
        ) : null}
        {error ? (
          <p className="m-0 font-sans text-[13px] font-light leading-[1.6] text-ink-body">
            {error}
          </p>
        ) : null}

        {/* Listen. Duration is measured from the narration, not asserted. */}
        {result?.narration && "speechSynthesis" in window ? (
          <div className="flex shrink-0 items-center gap-[11px] rounded-2xl bg-beige px-3.5 py-3">
            <button
              onClick={toggleSpeech}
              aria-label={speaking ? t("camera.stop") : t("camera.listen")}
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-terracotta active:bg-terracotta-hover"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ivory" fill="currentColor">
                {speaking ? (
                  <path d="M7 6h3.5v12H7zM13.5 6H17v12h-3.5z" />
                ) : (
                  // Mirrored in RTL: a play triangle has a direction.
                  <path d="M8 5.5v13l11-6.5Z" className="rtl:-scale-x-100 rtl:origin-center" />
                )}
              </svg>
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-sans text-[13px] font-medium text-brown">
                {t("camera.listenFor", { minutes: readingMinutes(result.narration) })}
              </span>
              <div className="flex h-[15px] items-end gap-[2.5px]">
                {WAVE_BARS.map((tone, i) => (
                  <div
                    key={i}
                    className={`h-full flex-1 origin-bottom rounded-sm ${WAVE_COLOUR[tone]} ${
                      speaking ? "animate-wave" : ""
                    }`}
                    style={
                      speaking
                        ? { animationDelay: `${i * 0.1}s` }
                        : // At rest, hold the shape the animation passes
                          // through, so it still reads as a waveform.
                          { transform: `scaleY(${WAVE_REST[i]})` }
                    }
                  />
                ))}
              </div>
            </div>
            <button
              onClick={switchLanguage}
              className="shrink-0 rounded-full bg-ivory px-2.5 py-1.5 text-[11px] font-medium text-terracotta active:bg-gray"
            >
              <span dir={language === "ar" ? "ltr" : "rtl"} className={otherFont(language)}>
                {language === "ar" ? "EN" : "عربي"}
              </span>
            </button>
          </div>
        ) : null}

        </div>

        {/* Add to My Trip · save · ask */}
        <div className="flex shrink-0 gap-[9px]">
          <button
            onClick={addToTrip}
            disabled={!tripLandmark || inTrip}
            className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-terracotta font-sans text-[13.5px] font-semibold text-ivory active:bg-terracotta-hover disabled:bg-beige disabled:text-ink-soft"
          >
            {inTrip ? (
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5.5v13M5.5 12h13" />
              </svg>
            )}
            {/*
              A stop inside Petra is not separately bookable, so the backend
              hands back the parent. Naming it keeps the button honest about
              what it is adding.
            */}
            {inTrip
              ? t("camera.inTrip")
              : tripLandmark && tripLandmark.id !== result?.landmark_id
                ? t("camera.addNamed", { name: pick(tripLandmark, "name") })
                : t("camera.addToTrip")}
          </button>
          <SquareButton
            label={t("camera.save")}
            onClick={() => notBuilt("camera.save")}
            className="opacity-55"
          >
            <path d="M6.5 4.5h11v15L12 16.1 6.5 19.5Z" />
          </SquareButton>
          <SquareButton
            label={t("camera.ask")}
            disabled={!result?.matched}
            onClick={() =>
              navigate("/chat", {
                state: { draft: t("camera.askDraft", { name: result.landmark }) },
              })
            }
          >
            <path d="M20 12.6c0 3.4-3.6 6.2-8 6.2-1 0-2-.15-2.9-.42L4 20l1.5-3.3A6.6 6.6 0 0 1 4 12.6c0-3.4 3.6-6.2 8-6.2s8 2.8 8 6.2Z" />
          </SquareButton>
        </div>

        {/* Last shot · mode switch · shutter */}
        <div className="flex shrink-0 items-center gap-3.5 pt-0.5">
          <button
            onClick={() => inputRef.current?.click()}
            aria-label={t("camera.lastShot")}
            className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[14px] bg-film shadow-[inset_0_0_0_1.5px_#FAF6F2] active:opacity-80"
          >
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : null}
          </button>

          <div
            role="tablist"
            aria-label={t("camera.modeLabel")}
            className="flex flex-1 rounded-full bg-beige p-[3px]"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => chooseMode(m.id)}
                className={`h-[38px] flex-1 rounded-full font-sans text-xs ${
                  mode === m.id
                    ? "bg-brown font-semibold text-ivory"
                    : "font-medium text-ink-muted active:bg-tint-rail"
                }`}
              >
                {t(m.key)}
              </button>
            ))}
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            aria-label={t("camera.shutter")}
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-ivory shadow-[0_0_0_2.5px_#B2543A] active:scale-95 disabled:opacity-60"
          >
            <span
              className={`h-10 w-10 rounded-full bg-terracotta ${
                loading ? "animate-breathe" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

/** Poppins carries no Arabic, so the عربي pill has to opt into Noto. */
const otherFont = (language) => (language === "ar" ? "font-sans" : "font-arabic");

/**
 * Roughly how long the narration takes to hear. The artboard says "2 min
 * story"; the real narrations are two or three sentences, so the number is
 * measured from the text at a speaking pace rather than copied across.
 */
function readingMinutes(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 130));
}

function Corner({ className }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute h-[34px] w-[34px] border-ivory ${className}`}
    />
  );
}

/** The MATCHED · 96% pill, and what stands in for it in the other states. */
function MatchPill({ loading, result, error }) {
  const { t } = useLanguage();

  let text = null;
  let tone = "bg-terracotta";
  let pulse = false;

  if (loading) {
    text = t("camera.reading");
    tone = "bg-night/70 backdrop-blur-lg";
    pulse = true;
  } else if (error) {
    return null;
  } else if (result?.matched) {
    // The percentage is the model's own confidence, not a fixed 96.
    text =
      result.confidence == null
        ? t("camera.matched")
        : t("camera.matchedPct", { pct: result.confidence });
    pulse = true;
  } else if (result) {
    text = t("camera.noMatch");
    tone = "bg-night/70 backdrop-blur-lg";
  }

  if (!text) return null;

  return (
    <div
      className={`absolute -top-[15px] start-1/2 z-10 flex -translate-x-1/2 items-center gap-[7px] rounded-full px-3 py-1.5 shadow-pill rtl:translate-x-1/2 ${tone}`}
    >
      <div
        className={`h-1.5 w-1.5 rounded-full bg-ivory ${pulse ? "animate-breathe" : "opacity-55"}`}
      />
      <span className="whitespace-nowrap font-sans text-[11px] font-semibold tracking-[.04em] text-ivory">
        {text}
      </span>
    </div>
  );
}

/**
 * Golden hour, recomputed every minute. Real sunset arithmetic for Petra —
 * see utils/sun.js for why the position is fixed rather than requested.
 */
function GoldenHourChip() {
  const { t, language } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const golden = useMemo(() => goldenHour(now), [now]);
  const label = golden.active
    ? t("camera.goldenLeft", { minutes: golden.minutesLeft })
    : t("camera.goldenFrom", {
        // `-u-nu-latn`: the rest of the app writes numbers in Western
        // digits (prices, durations, the confidence score), so the clock
        // should not be the one place that switches to Arabic-Indic.
        time: golden.startsAt.toLocaleTimeString(
          language === "ar" ? "ar-JO-u-nu-latn" : "en-GB",
          { hour: "2-digit", minute: "2-digit" },
        ),
      });

  return (
    <div className="absolute start-5 top-[52px] flex items-center gap-2 rounded-xl bg-night/55 px-3 py-2 backdrop-blur-lg">
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px] shrink-0 text-glow"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="3.4" />
        <path d="M12 3.6v2.4M12 18v2.4M3.6 12H6M18 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7" />
      </svg>
      <span className="font-sans text-[11.5px] font-medium text-ivory">{label}</span>
    </div>
  );
}

/** A viewfinder overlay button: frosted square on the dark ground. */
function GlassButton({ label, onClick, children, className = "", pressed = undefined }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-9 w-9 place-items-center rounded-xl bg-night/55 backdrop-blur-lg active:bg-night/80 ${
        pressed === false ? "opacity-50" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[17px] w-[17px] text-ivory"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

/** A 46px action square in the sheet's button row. */
function SquareButton({ label, onClick, children, disabled = false, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-beige active:bg-tint-rail disabled:opacity-40 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[19px] w-[19px] text-brown"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

/**
 * The sheet's name row. The artboard shows the identified state; the other
 * four (nothing shot yet, looking, no match, failed) reuse the same slot so
 * the sheet does not change shape underneath you.
 */
function Headline({ loading, error, result, hasPhoto, mode }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <Row
        title={t("camera.identifying")}
        subtitle={t(`camera.working.${mode}`)}
        badge={{ text: t("camera.reading"), tone: "wait" }}
      />
    );
  }
  if (error) {
    return <Row title={t("camera.error")} badge={{ text: t("common.error"), tone: "wait" }} />;
  }
  if (!hasPhoto) {
    return <Row title={t("camera.idle")} subtitle={t(`camera.hint.${mode}`)} />;
  }
  if (!result?.matched) {
    return (
      <Row
        title={result?.landmark || t("camera.noMatchTitle")}
        subtitle={t(`camera.noMatchHint.${mode}`)}
        badge={{ text: t("camera.noMatch"), tone: "wait" }}
      />
    );
  }
  return (
    <Row
      title={result.landmark}
      arabic={result.name_ar}
      subtitle={result.subtitle}
      badge={{ text: t(`camera.badge.${mode}`), tone: "ok" }}
    />
  );
}

function Row({ title, arabic, subtitle, badge }) {
  const { language } = useLanguage();
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-sans text-[21px] font-semibold tracking-[-.01em] text-brown">
            {title}
          </span>
          {/* Redundant when the app is already in Arabic. */}
          {arabic && language !== "ar" ? (
            <span dir="rtl" className="font-arabic text-sm font-medium text-terracotta">
              {arabic}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <span className="font-sans text-xs font-light leading-snug text-ink-muted">
            {subtitle}
          </span>
        ) : null}
      </div>
      {badge ? (
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-[11px] py-[7px] ${
            badge.tone === "ok" ? "bg-success/[.14]" : "bg-beige"
          }`}
        >
          {badge.tone === "ok" ? (
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 text-success-ink"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          ) : null}
          <span
            className={`whitespace-nowrap font-sans text-[11px] font-semibold ${
              badge.tone === "ok" ? "text-success-ink" : "text-ink-muted"
            }`}
          >
            {badge.text}
          </span>
        </div>
      ) : null}
    </div>
  );
}
