import { useDrag } from "@use-gesture/react";
import { useEffect, useRef, useState } from "react";

import { useFormatDuration, useLanguage } from "../i18n/LanguageContext.jsx";
import { sizedImage } from "../utils/images.js";
import { DifficultyBadge } from "./ui.jsx";

const COMMIT_DISTANCE = 110; // px before a drag counts as a decision
const FLICK_VELOCITY = 0.45; // a fast short flick counts too
const EXIT_MS = 280;

/**
 * One card in the deck. Right means add, left means skip — physically, in both
 * reading directions, because "right = yes" is the gesture people already know
 * and mirroring it in Arabic would be a surprise, not a courtesy.
 */
export default function SwipeCard({ landmark, onSwipe, onOpen, command, depth = 0 }) {
  const { pick, t } = useLanguage();
  const formatDuration = useFormatDuration();
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [exit, setExit] = useState(null);
  // A drag that springs back still fires a native click on release. Without
  // this the detail sheet pops open every time someone half-swipes.
  const movedRef = useRef(false);
  const isTop = depth === 0;

  // The buttons under the deck drive the same animation as a real drag.
  useEffect(() => {
    if (command?.token && isTop && !exit) setExit(command.dir);
  }, [command?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!exit) return undefined;
    const timer = setTimeout(() => onSwipe(exit), EXIT_MS);
    return () => clearTimeout(timer);
  }, [exit, onSwipe]);

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
  const stackOffset = depth * 10;
  const stackScale = 1 - depth * 0.04;

  const style = {
    transform: exit
      ? `translate3d(${x}px, -40px, 0) rotate(${x > 0 ? 22 : -22}deg)`
      : `translate3d(${x}px, ${stackOffset}px, 0) rotate(${rotation}deg) scale(${stackScale})`,
    transition: drag.active ? "none" : `transform ${EXIT_MS}ms ease-out, opacity ${EXIT_MS}ms ease-out`,
    opacity: exit ? 0 : 1,
    zIndex: 30 - depth,
  };

  const image = sizedImage(landmark.image_url);
  const intent = Math.max(-1, Math.min(1, x / COMMIT_DISTANCE));

  return (
    <div
      {...(isTop ? bind() : {})}
      style={style}
      className="absolute inset-0 touch-none select-none"
    >
      <button
        type="button"
        onClick={() => {
          if (!isTop || drag.active || movedRef.current) return;
          onOpen?.(landmark);
        }}
        className="relative h-full w-full overflow-hidden rounded-3xl bg-sand-800 text-start shadow-card"
      >
        {image ? (
          <img
            src={image}
            alt=""
            draggable="false"
            loading={depth < 2 ? "eager" : "lazy"}
            className="h-full w-full object-cover"
          />
        ) : (
          // Five researched places genuinely have no free-licensed photograph.
          // A designed placeholder is honest; a stock photo of somewhere else
          // would not be.
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand-600 via-sand-700 to-sand-900 p-8">
            <span className="text-center text-2xl font-bold leading-snug text-sand-100/90">
              {pick(landmark, "name")}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16">
          <h2 className="text-2xl font-bold leading-tight text-white drop-shadow">
            {pick(landmark, "name")}
          </h2>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/80">
            {pick(landmark, "description")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              {formatDuration(landmark.avg_visit_minutes)}
            </span>
            {landmark.difficulty ? <DifficultyBadge level={landmark.difficulty} /> : null}
            {landmark.requires_guide ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                {t("trip.guideRecommended")}
              </span>
            ) : null}
          </div>
        </div>

        {isTop ? (
          <>
            <Stamp side="start" tone="emerald" label={t("explore.stampAdd")} opacity={Math.max(0, intent)} />
            <Stamp side="end" tone="rose" label={t("explore.stampSkip")} opacity={Math.max(0, -intent)} />
          </>
        ) : null}
      </button>
    </div>
  );
}

/** The ADD / SKIP stamp that fades in as the card is dragged. */
function Stamp({ side, tone, label, opacity }) {
  const tones = {
    emerald: "border-emerald-400 text-emerald-300",
    rose: "border-rose-400 text-rose-300",
  };
  // "start" is physically left in LTR, so anchor by physical side to keep the
  // stamp on the side the card is actually moving towards.
  const position = side === "start" ? "left-5 -rotate-12" : "right-5 rotate-12";
  return (
    <div
      aria-hidden="true"
      style={{ opacity }}
      className={`pointer-events-none absolute top-6 ${position} rounded-xl border-4 px-3 py-1 text-2xl font-black tracking-wider ${tones[tone]} bg-black/25 backdrop-blur-sm transition-opacity`}
    >
      {label}
    </div>
  );
}
