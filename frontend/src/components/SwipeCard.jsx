import { useDrag } from "@use-gesture/react";
import { useEffect, useRef, useState } from "react";

import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { gallery, heroImage, sizedImage } from "../utils/images.js";
import { Badge, DifficultyBadge } from "./ui.jsx";

const COMMIT_DISTANCE = 110; // px before a drag counts as a decision
const FLICK_VELOCITY = 0.45; // a fast short flick counts too
const EXIT_MS = 280;

/**
 * One card in the deck, restyled to the Terhal export (24px radius, hatched
 * photo ground, deep-brown scrim, terracotta HIDDEN GEM tag).
 *
 * The gesture logic is carried over from the old implementation unchanged —
 * commit distance, flick velocity, the moved-ref that stops a half-swipe from
 * opening the sheet, and the ref-held onSwipe that keeps the exit timer from
 * restarting on parent re-render. That behaviour was hard-won; only the markup
 * is new.
 *
 * Right still means add in both reading directions. Mirroring a gesture people
 * already know would be a surprise, not a courtesy.
 */
export default function SwipeCard({ landmark, onSwipe, onOpen, command, depth = 0 }) {
  const { pick, t } = useLanguage();
  const formatDuration = useFormatDuration();
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exit, setExit] = useState(null);
  const movedRef = useRef(false);
  const isTop = depth === 0;

  // The buttons under the deck drive the same animation as a real drag.
  useEffect(() => {
    if (command?.token && isTop && !exit) setExit(command.dir);
  }, [command?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  // onSwipe is rebuilt on every parent render, so depending on it here would
  // clear and restart the commit timer each time.
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  useEffect(() => {
    if (!exit) return undefined;
    const timer = setTimeout(() => onSwipeRef.current(exit), EXIT_MS);
    return () => clearTimeout(timer);
  }, [exit]);

  const bind = useDrag(
    ({ first, down, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!isTop || exit) return;
      if (first) movedRef.current = false;
      if (Math.abs(mx) > 5) movedRef.current = true;
      if (down) {
        setDrag({ x: mx, active: true });
        return;
      }
      const decided = Math.abs(mx) > COMMIT_DISTANCE || vx > FLICK_VELOCITY;
      if (decided) {
        setExit(mx > 0 || dx > 0 ? "right" : "left");
        setDrag({ x: mx, active: false });
      } else {
        setDrag({ x: 0, active: false });
      }
    },
    { filterTaps: true, enabled: isTop && !exit },
  );

  const x = exit ? (exit === "right" ? 700 : -700) : drag.x;
  const rotation = (x / 18).toFixed(2);

  // The export stacks three cards, each inset and dropped behind the last.
  const inset = depth * 9;
  const drop = depth * 8;

  const style = {
    transform: exit
      ? `translate3d(${x}px, -40px, 0) rotate(${x > 0 ? 22 : -22}deg)`
      : `translate3d(${x}px, ${drop}px, 0) rotate(${rotation}deg)`,
    transition: drag.active
      ? "none"
      : `transform ${EXIT_MS}ms ease-out, opacity ${EXIT_MS}ms ease-out`,
    opacity: exit ? 0 : 1,
    zIndex: 30 - depth,
    insetInline: `${inset}px`,
  };

  // Hero comes from the gallery when there is one, so replacing image 1 in
  // data/landmark_images.csv changes the card without touching this file.
  const shots = gallery(landmark);
  const hero = heroImage(landmark);
  const image = sizedImage(hero?.url);
  const intent = Math.max(-1, Math.min(1, x / COMMIT_DISTANCE));

  return (
    <div
      {...(isTop ? bind() : {})}
      style={style}
      className="absolute top-0 h-[490px] touch-none select-none"
    >
      <button
        type="button"
        onClick={() => {
          if (!isTop || drag.active || movedRef.current) return;
          onOpen?.(landmark);
        }}
        className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-frame bg-hatch text-start shadow-card"
      >
        {image ? (
          <img
            src={image}
            alt=""
            draggable="false"
            loading={depth < 2 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {/* Top row: hidden-gem tag, and the photo credit slot when there is one. */}
        <div className="relative flex items-start justify-between p-4">
          <span className="flex items-center gap-[7px] rounded-full bg-terracotta px-[13px] py-[7px]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FAF6F2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6.7 7-11.3A7 7 0 0 0 5 9.7C5 14.3 12 21 12 21Z" />
              <circle cx="12" cy="9.6" r="2.2" />
            </svg>
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[.09em] text-ivory">
              {t("explore.hiddenGem")}
            </span>
          </span>
          {!image ? (
            <span className="rounded-md bg-ivory/[.86] px-[7px] py-1 font-mono text-[9.5px] text-ink-stamp">
              {t("common.noPhoto")}
            </span>
          ) : shots.length > 1 ? (
            <span className="flex items-center gap-1 rounded-full bg-brown/45 px-2 py-1 font-sans text-[10px] font-medium text-ivory backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              >
                <rect x="3" y="6" width="14" height="12" rx="2" />
                <path d="M20 8v9a1 1 0 0 1-1 1" />
              </svg>
              {shots.length}
            </span>
          ) : null}
        </div>

        {/* Bottom scrim: name, one-liner, chip row. */}
        <div className="relative flex flex-col gap-[7px] bg-gradient-to-t from-brown/[.82] via-brown/[.82] to-transparent px-5 pb-[22px] pt-16">
          <h3 className="font-sans text-[27px] font-semibold leading-tight tracking-[-.01em] text-ivory">
            {pick(landmark, "name")}
          </h3>
          <p className="line-clamp-2 font-sans text-[13.5px] font-light leading-snug text-beige">
            {pick(landmark, "description")}
          </p>
          <div className="mt-[5px] flex flex-wrap gap-[7px]">
            {landmark.entrance_fee_notes?.toLowerCase().includes("free") ? (
              <Badge tone="onImage">{t("explore.freeEntry")}</Badge>
            ) : null}
            <Badge tone="onImage">{formatDuration(landmark.avg_visit_minutes)}</Badge>
            <DifficultyBadge level={landmark.difficulty} onImage />
            {landmark.requires_guide ? (
              <Badge tone="onImage">{t("trip.guideRecommended")}</Badge>
            ) : null}
          </div>
        </div>

        {isTop ? (
          <>
            <Stamp side="start" tone="add" label={t("explore.stampAdd")} opacity={Math.max(0, intent)} />
            <Stamp side="end" tone="skip" label={t("explore.stampSkip")} opacity={Math.max(0, -intent)} />
          </>
        ) : null}
      </button>
    </div>
  );
}

/** The ADD / SKIP stamp that fades in as the card is dragged. */
function Stamp({ side, tone, label, opacity }) {
  const tones = {
    add: "border-ivory text-ivory",
    skip: "border-sandstone text-sandstone",
  };
  // Anchored by physical side, matching the physical gesture.
  const position = side === "start" ? "left-5 -rotate-12" : "right-5 rotate-12";
  return (
    <div
      aria-hidden="true"
      style={{ opacity }}
      className={`pointer-events-none absolute top-6 ${position} rounded-xl border-4 bg-brown/25 px-3 py-1 font-sans text-2xl font-bold tracking-wider backdrop-blur-sm transition-opacity ${tones[tone]}`}
    >
      {label}
    </div>
  );
}
