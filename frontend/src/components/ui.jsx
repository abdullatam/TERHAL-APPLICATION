import { useLanguage } from "../i18n/LanguageContext.jsx";

/** Colour-coded chip used for verification, welfare and accessibility marks. */
export function Badge({ tone = "sand", children, className = "" }) {
  const tones = {
    sand: "bg-sand-100 text-sand-700",
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-sky-100 text-sky-800",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ level }) {
  const { t } = useLanguage();
  if (!level) return null;
  const tone = { easy: "green", moderate: "amber", difficult: "rose" }[level] ?? "sand";
  return <Badge tone={tone}>{t(`difficulty.${level}`)}</Badge>;
}

/**
 * Providers have no photographs — inventing a face for a fabricated profile
 * would be worse than an initial, so the initial is the design.
 */
export function Avatar({ name = "", size = 44, url = null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  // Stable colour per person, so the same advisor looks the same everywhere.
  const hue = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, hsl(${hue} 45% 46%), hsl(${(hue + 40) % 360} 45% 34%))`,
      }}
    >
      {initials}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-sand-500">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-sand-300 border-t-rose-500" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <h2 className="text-lg font-semibold text-sand-800">{title}</h2>
      {body ? <p className="max-w-xs text-sm leading-relaxed text-sand-600">{body}</p> : null}
      {action}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl bg-rose-500 px-5 py-3.5 text-base font-semibold text-white shadow-card transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl border border-sand-300 bg-white px-5 py-3 text-base font-semibold text-sand-700 transition active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Line-by-line price with the demo-pricing disclosure attached. */
export function PriceBreakdown({ quote, compact = false }) {
  const { t, language } = useLanguage();
  if (!quote) return null;
  return (
    <div className={compact ? "text-xs" : "text-sm"}>
      <ul className="space-y-1.5">
        {quote.breakdown.map((line, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4 text-sand-600">
            <span>{language === "ar" ? line.label_ar : line.label_en}</span>
            <span className="tabular-nums">{line.amount_jod.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-sand-200 pt-2 font-semibold text-sand-900">
        <span>{t("price.total")}</span>
        <span className="tabular-nums">{quote.total_jod.toFixed(2)} JOD</span>
      </div>
      {quote.is_mock ? (
        <p className="mt-2 text-[11px] leading-snug text-amber-700">{t("price.mock")}</p>
      ) : null}
    </div>
  );
}
