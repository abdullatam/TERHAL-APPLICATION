import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { StatusBar, HomeIndicator } from "../components/Shell.jsx";
import { useOnboarding } from "../state/OnboardingContext.jsx";

/**
 * Splash — screen 01. The one place the brand gradient is allowed as a full
 * background (the other is the Passport progress fill).
 *
 * It holds for a beat and then leaves on its own, to whichever step this
 * device still owes: the slides on a first run, the role question if the
 * slides were seen or skipped without one being answered, and otherwise
 * straight into the half of the app that was chosen.
 */
const HOLD_MS = 1500;

export default function Splash() {
  const navigate = useNavigate();
  const { seen, role } = useOnboarding();

  useEffect(() => {
    const next = !seen
      ? "/welcome"
      : !role
        ? "/welcome/role"
        : role === "guide"
          ? "/guide"
          : "/explore";
    const timer = setTimeout(() => navigate(next, { replace: true }), HOLD_MS);
    return () => clearTimeout(timer);
  }, [navigate, seen, role]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-terhal-gradient">
      <StatusBar tone="ivory" />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-[34px] px-[34px]">
        {/* Wayfinding squiggles, top-trailing. Anchored to the content
            region rather than the screen, so hiding the status bar on a real
            device does not move them down by its height. */}
        <svg
          viewBox="0 0 60 12"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute end-0 top-[66px] h-3.5 w-[66px] opacity-55"
          fill="none"
          stroke="#FAF6F2"
          strokeWidth="1.1"
          strokeLinecap="round"
        >
          <path d="M2 7c2.2-3.4 4.4-3.4 6.6 0 2.2-3.4 4.4-3.4 6.6 0" />
          <path d="M22 3.4c1.6-2.4 3.2-2.4 4.8 0 1.6-2.4 3.2-2.4 4.8 0" />
          <path d="M38 8.6c1.3-2 2.6-2 3.9 0 1.3-2 2.6-2 3.9 0" />
        </svg>

        <div className="rounded-[34px] bg-ivory px-[30px] pb-[30px] pt-[34px] shadow-lockup">
          <img
            src="/brand/terhal-lockup.png"
            alt="Terhal"
            className="block h-auto w-[236px]"
          />
        </div>
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-ivory" />
          <span className="h-2 w-2 rounded-full bg-ivory opacity-55" />
          <span className="h-2 w-2 rounded-full bg-ivory opacity-30" />
        </div>
      </div>

      {/* Ridge line silhouette. */}
      <div className="relative h-[180px] shrink-0">
        <svg
          viewBox="0 0 390 180"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          fill="none"
        >
          <path d="M0 148 78 84l46 40 52-56 62 66 54-44 98 82v88H0Z" fill="#FAF6F2" opacity=".14" />
          <path d="M0 170 96 108l60 44 66-52 74 62 94-40v88H0Z" fill="#FAF6F2" opacity=".2" />
        </svg>
        <div className="absolute inset-x-0 bottom-[52px] text-center font-sans text-[11px] tracking-[.34em] text-ivory opacity-[.82]">
          AMMAN · PETRA · WADI RUM
        </div>
      </div>

      <HomeIndicator tone="ivory" />
    </div>
  );
}
