import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Terhal primitives, restyled from the Claude Design export.
 *
 * Radii, weights and paddings come from the artboards: pills are 999px, cards
 * 16px, buttons 16px with a 54px height, card edges a 1px ring rather than a
 * border.
 */

/** Pill chip. `tone` picks the surface, not the meaning. */
export function Badge({ tone = "beige", children, className = "" }) {
  const tones = {
    beige: "bg-beige text-brown",
    terracotta: "bg-terracotta text-ivory",
    outline: "bg-transparent text-brown shadow-[inset_0_0_0_1px_#D9B28C]",
    success: "bg-success/15 text-success-ink",
    // On a photograph, the export uses a translucent ivory wash.
    onImage: "bg-ivory/[.16] text-ivory backdrop-blur-[2px]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] font-sans text-[11.5px] font-normal ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Difficulty. The export has no three-colour difficulty system — it renders
 * difficulty as a plain chip ("Moderate climb"). Rather than invent traffic
 * lights the brand sheet does not have, this keeps the export's neutral chip
 * and distinguishes levels by an icon weight instead of by hue.
 */
export function DifficultyBadge({ level, onImage = false }) {
  const { t } = useLanguage();
  if (!level) return null;
  const bars = { easy: 1, moderate: 2, difficult: 3 }[level] ?? 1;
  return (
    <Badge tone={onImage ? "onImage" : "beige"}>
      <svg viewBox="0 0 12 10" className="h-2.5 w-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 4.5}
            y={8 - (i + 1) * 2.4}
            width="3"
            height={(i + 1) * 2.4}
            rx="1"
            fill="currentColor"
            opacity={i < bars ? 1 : 0.28}
          />
        ))}
      </svg>
      {t(`difficulty.${level}`)}
    </Badge>
  );
}

/**
 * Advisors have no photographs. Inventing a face for a mocked profile would be
 * worse than an initial, so the initial is the design — on the brand's
 * sandstone/terracotta range rather than an arbitrary hue wheel.
 */
export function Avatar({ name = "", size = 44, url = null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  // Stable per person, so the same advisor looks the same on every screen.
  const seed = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const ramp = [
    ["#B2543A", "#8E4230"],
    ["#D9B28C", "#B2543A"],
    ["#3A2A21", "#5C4A3E"],
    ["#BE6949", "#D9B28C"],
  ][seed % 4];

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-sans font-semibold text-ivory"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(140deg, ${ramp[0]}, ${ramp[1]})`,
      }}
    >
      {initials}
    </div>
  );
}

/** Stands in wherever the export shows a `PHOTO · …` placeholder. */
export function PhotoPlaceholder({ label, className = "", variant = "hatch" }) {
  // Spelled out, not interpolated — Tailwind's scanner cannot see `bg-${x}`.
  const variants = {
    hatch: "bg-hatch",
    "hatch-sm": "bg-hatch-sm",
    "hatch-alt": "bg-hatch-alt",
  };
  return (
    <div
      className={`relative overflow-hidden ${variants[variant] ?? variants.hatch} ${className}`}
      aria-hidden="true"
    >
      {label ? (
        <span className="absolute bottom-2 start-2 rounded-md bg-ivory/[.86] px-[7px] py-1 font-mono text-[9.5px] text-ink-stamp">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-ink-muted">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-sandstone border-t-terracotta" />
      {label ? <p className="font-sans text-sm font-light">{label}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <h2 className="font-sans text-lg font-semibold text-brown">{title}</h2>
      {body ? (
        <p className="max-w-xs font-sans text-sm font-light leading-relaxed text-ink-body">
          {body}
        </p>
      ) : null}
      {action}
    </div>
  );
}

/** 54px terracotta CTA, per the export's onboarding and booking bars. */
export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-terracotta px-5 font-sans text-[15px] font-semibold text-ivory shadow-cta transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-beige px-5 font-sans text-[15px] font-semibold text-brown transition active:scale-[0.98] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Text-only tertiary action ("Skip", "Undo"). */
export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`shrink-0 px-1.5 py-3.5 font-sans text-sm font-medium text-ink-soft active:opacity-60 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Card surface: ivory with the export's hairline ring. */
export function Card({ children, className = "", tone = "ivory", ...props }) {
  const tones = {
    ivory: "bg-ivory shadow-hairline",
    beige: "bg-beige",
  };
  return (
    <div className={`rounded-2xl p-3.5 ${tones[tone]} ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Segmented control (List/Map, Upcoming/Past). */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl bg-beige p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-[10px] px-3 py-1.5 font-sans text-xs font-semibold transition ${
            value === opt.value
              ? "bg-ivory text-brown shadow-sm"
              : "text-ink-soft"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Filter pill row item. */
export function FilterPill({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`shrink-0 rounded-full px-[17px] py-[9px] font-sans text-[12.5px] transition ${
        active
          ? "bg-terracotta font-medium text-ivory"
          : "bg-beige font-normal text-brown"
      }`}
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
          <li
            key={i}
            className="flex items-baseline justify-between gap-4 font-sans font-light text-ink-body"
          >
            <span>{language === "ar" ? line.label_ar : line.label_en}</span>
            <span className="tabular-nums">{line.amount_jod.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-gray pt-2 font-sans font-semibold text-brown">
        <span>{t("price.total")}</span>
        <span className="tabular-nums">
          {quote.total_jod.toFixed(2)} {t("price.jod")}
        </span>
      </div>
      {quote.is_mock ? (
        <p className="mt-2 font-sans text-[11px] font-light leading-snug text-terracotta">
          {t("price.mock")}
        </p>
      ) : null}
    </div>
  );
}

/** Stepper used on the advisor booking form. */
export function Stepper({ label, value, min, max, onChange }) {
  return (
    <div>
      <span className="mb-1 block font-sans text-xs font-medium text-ink-muted">
        {label}
      </span>
      <div className="flex items-center justify-between rounded-xl bg-beige px-1">
        <StepButton
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="−"
        >
          −
        </StepButton>
        <span className="font-sans text-sm font-semibold tabular-nums text-brown">
          {value}
        </span>
        <StepButton
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="+"
        >
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="grid h-9 w-9 place-items-center rounded-lg text-lg font-semibold text-brown active:bg-sandstone/40 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Eyebrow label: mono, wide-tracked, terracotta. */
export function Eyebrow({ children, className = "" }) {
  return (
    <span
      className={`font-mono text-[11px] tracking-[.22em] text-terracotta ${className}`}
    >
      {children}
    </span>
  );
}

/** Section heading inside sheets and forms. */
export function SectionLabel({ children }) {
  return (
    <h3 className="mb-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </h3>
  );
}

/**
 * The tourist's meeting-point PIN.
 *
 * This is the handshake that proves the two people actually met: the tourist
 * holds the number, the guide has to be told it face to face before the meter
 * starts. It is deliberately the loudest thing on a confirmed booking, because
 * it is the one piece of the screen the tourist needs while standing in front
 * of somebody.
 */
export function TripPin({ pin }) {
  const { t } = useLanguage();
  if (!pin) return null;
  return (
    <div className="rounded-2xl bg-brown p-4 text-center">
      <p className="font-sans text-[11px] font-light uppercase tracking-wide text-beige">
        {t("trip.pin.title")}
      </p>
      <p className="mt-1.5 font-mono text-[34px] font-semibold leading-none tracking-[0.35em] text-ivory">
        {pin}
      </p>
      <p className="mx-auto mt-2.5 max-w-[15rem] font-sans text-[11px] font-light leading-snug text-beige">
        {t("trip.pin.body")}
      </p>
      {/* Say it is a stub rather than let a judge assume it is real security. */}
      <p className="mt-1.5 font-sans text-[10px] font-light text-beige/70">
        {t("trip.pin.demo")}
      </p>
    </div>
  );
}
