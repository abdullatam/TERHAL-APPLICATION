import { Children, Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { HeaderAction, StatusBar } from "../components/Shell.jsx";
import { useToast } from "../components/Toast.jsx";
import { PrimaryButton, SecondaryButton, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useOnboarding } from "../state/OnboardingContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

/**
 * Profile — screen 18.
 *
 * The artboard shows a signed-in person ("Layla Haddad · Amman · travelling
 * since Mar 2025"). There is no user table and no auth in this build — both
 * are out of MVP scope per PROJECT.md §5 — so inventing a name and a join
 * date would put a fabricated person on screen and make the demo look like it
 * has accounts it does not have.
 *
 * Instead the identity block says plainly that this is a guest on this device,
 * and every number below it is real:
 *
 *   trips   = bookings on record            GET /bookings
 *   stamps  = passport stamps earned        GET /passport
 *   reviews = reviews written               GET /reviews
 *   saved   = places swiped right           TripContext
 *
 * The "Local First supporter" badge is earned rather than decorative: it
 * appears once a verified advisor has actually been booked.
 *
 * Payment methods and notifications are in the artboard but have nothing
 * behind them, so they are rendered inert and labelled — a row that looks
 * tappable and silently does nothing is worse than one that says why.
 *
 * Sign out does have something behind it. With no account to log out of, the
 * session *is* the device: the swipes, trip settings and itinerary held in
 * localStorage, plus the onboarding flag. Signing out clears exactly those and
 * returns to the splash, which then routes to onboarding as a first run would.
 * Bookings and reviews were POSTed to the server and are not the client's to
 * delete, so the sheet says so rather than implying a full wipe.
 */
export default function Profile() {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const { approved, reset: resetTrip } = useTrip();
  const { reset: resetOnboarding, chooseRole } = useOnboarding();
  const { toast } = useToast();

  const [bookings, setBookings] = useState(null);
  const [passport, setPassport] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.bookings().catch(() => []),
      api.passport().catch(() => null),
      api.reviews().catch(() => []),
    ])
      .then(([b, p, r]) => {
        if (cancelled) return;
        setBookings(b);
        setPassport(p);
        setReviews(r);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => (bookings ?? []).filter((b) => b.date >= today && b.status !== "cancelled"),
    [bookings, today],
  );
  // Earned, not decorative: a verified advisor has actually been booked.
  const localFirst = useMemo(
    () => (bookings ?? []).some((b) => b.provider?.verified && b.status !== "cancelled"),
    [bookings],
  );

  const loading = bookings === null;

  const signOut = () => {
    resetTrip();
    resetOnboarding();
    setConfirmingSignOut(false);
    toast({ title: t("profile.signOut.toast"), body: t("profile.signOut.toastBody") });
    // replace, so Back cannot land on a Profile reading the cleared trip.
    navigate("/", { replace: true });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />

      {/* Beige identity band with the ridge wash. */}
      <div className="relative shrink-0 overflow-hidden bg-beige px-[22px] pb-5 pt-1.5">
        <svg
          viewBox="0 0 390 110"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[110px] w-full opacity-45"
          fill="none"
        >
          <path d="M0 92 78 44l46 30 54-40 62 48 50-26 100 56v18H0Z" fill="#D9B28C" />
        </svg>

        <div className="relative flex items-center justify-between">
          <h1 className="font-sans text-2xl font-semibold text-brown">
            {t("profile.title")}
          </h1>
          <div className="flex items-center gap-2">
            <HeaderAction label={t("profile.help")} onClick={() => navigate("/chat")}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 14.2a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.3a1.8 1.8 0 1 1-3.6 0v-.2a1.5 1.5 0 0 0-2.7-1.1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.3a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1.1-2.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.3a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 2.7 1.1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.3a1.8 1.8 0 1 1 0 3.6h-.2a1.5 1.5 0 0 0-1.4.9Z" />
              </svg>
            </HeaderAction>
          </div>
        </div>

        <div className="relative mt-[18px] flex items-center gap-[15px]">
          <div className="h-[78px] w-[78px] shrink-0 rounded-[24px] bg-hatch ring-4 ring-ivory" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-sans text-xl font-semibold text-brown">
              {t("profile.guest")}
            </span>
            <span className="font-sans text-[12.5px] font-light leading-snug text-ink-muted">
              {t("profile.guestBody")}
            </span>
            {localFirst ? (
              <span className="mt-1 flex items-center gap-1.5 self-start rounded-full bg-terracotta/[.12] px-[11px] py-[5px]">
                <img
                  src="/brand/terhal-icon.png"
                  alt=""
                  className="h-[13px] w-[13px] object-contain"
                />
                <span className="font-sans text-[11px] font-medium text-terracotta">
                  {t("profile.localFirst")}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-[22px] pt-[18px]">
        {error ? (
          <p className="rounded-2xl bg-beige p-4 font-sans text-sm text-brown">{error}</p>
        ) : null}
        {loading ? <Spinner /> : null}

        {!loading ? (
          <>
            <div className="flex gap-2.5">
              <StatCard value={bookings.length} label={t("profile.trips")} />
              <StatCard value={passport?.collected ?? 0} label={t("profile.stamps")} />
              <StatCard value={reviews?.length ?? 0} label={t("profile.reviews")} />
            </div>

            {/* Passport summary — tapping opens the full screen. */}
            <button
              onClick={() => navigate("/passport")}
              className="flex w-full flex-col gap-2.5 rounded-[18px] bg-ivory p-4 text-start shadow-hairline active:bg-beige"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="font-sans text-[14.5px] font-medium text-brown">
                    {t("passport.title")}
                  </span>
                  <span className="font-sans text-xs font-light text-ink-muted">
                    {t("profile.passportProgress", {
                      n: passport?.collected ?? 0,
                      d: passport?.total ?? 0,
                      r: Math.max(0, (passport?.total ?? 0) - (passport?.collected ?? 0)),
                    })}
                  </span>
                </span>
                <Chevron />
              </div>
              <span className="h-2.5 w-full overflow-hidden rounded-full bg-beige">
                <span
                  className="block h-full rounded-full bg-terhal-progress transition-[width] duration-500"
                  style={{ width: `${passport?.percent ?? 0}%` }}
                />
              </span>
            </button>

            {/* Things that exist and work. */}
            <MenuGroup>
              <MenuRow
                icon={<HeartIcon />}
                label={t("profile.saved")}
                value={approved.length}
                onClick={() => navigate("/trip")}
              />
              <MenuRow
                icon={<CalendarIcon />}
                label={t("profile.myBookings")}
                value={
                  upcoming.length
                    ? t("profile.upcomingCount", { n: upcoming.length })
                    : bookings.length
                }
                onClick={() => navigate("/bookings")}
              />
              <MenuRow
                icon={<StarIcon />}
                label={t("profile.myReviews")}
                value={reviews?.length || t("profile.reviewsEmpty")}
                onClick={reviews?.length ? () => navigate("/bookings") : null}
              />
              <MenuRow
                icon={<BagIcon />}
                label={t("profile.artisans")}
                onClick={() => navigate("/marketplace")}
              />
            </MenuGroup>

            {/* Settings. Language is real; the other two are not. */}
            <MenuGroup>
              <div className="flex items-center gap-[13px] px-4 py-3">
                <span className="text-terracotta">
                  <GlobeIcon />
                </span>
                <span className="flex-1 font-sans text-sm text-brown">
                  {t("profile.language")}
                </span>
                {/* Drives the same toggle as the top bar, so the two never disagree. */}
                <div className="flex rounded-full bg-beige p-[3px]">
                  {[
                    { code: "en", label: "EN", font: "font-sans" },
                    { code: "ar", label: "ع", font: "font-arabic" },
                  ].map(({ code, label, font }) => (
                    <button
                      key={code}
                      onClick={() => language !== code && toggleLanguage()}
                      aria-pressed={language === code}
                      className={`rounded-full px-[13px] py-[5px] text-[11.5px] font-medium ${font} ${
                        language === code
                          ? "bg-terracotta text-ivory"
                          : "text-ink-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <InertRow icon={<BellIcon />} label={t("profile.notifications")} />
              <MenuRow
                icon={<HelpIcon />}
                label={t("profile.help")}
                onClick={() => navigate("/chat")}
              />
              <InertRow icon={<CardIcon />} label={t("profile.payment")} />
            </MenuGroup>

            {/*
              The other side of the door. Screen 00 promises you can switch
              sides from your profile, so this is that promise: it moves the
              remembered role, which is also what the splash reads, so the app
              opens on the guide side next time too.
            */}
            <MenuGroup>
              <MenuRow
                icon={<RidgeIcon />}
                label={t("role.switchToGuide")}
                onClick={() => {
                  chooseRole("guide");
                  navigate("/guide");
                }}
              />
            </MenuGroup>

            {/* The artboard's Sign out link — see the note at the top. */}
            <div className="pb-2 text-center">
              <button
                onClick={() => setConfirmingSignOut(true)}
                className="rounded-full px-4 py-1.5 font-sans text-[13.5px] font-medium text-terracotta active:bg-beige"
              >
                {t("profile.signOut")}
              </button>
            </div>
          </>
        ) : null}
      </div>

      {confirmingSignOut ? (
        <SignOutSheet onConfirm={signOut} onCancel={() => setConfirmingSignOut(false)} />
      ) : null}
    </div>
  );
}

/**
 * Confirmation sheet, in the same idiom as the landmark sheet: scrim, rounded
 * top, grabber. Destructive and unrecoverable — a swiped-together trip is real
 * work — so it is a deliberate two-tap, and it names what goes and what stays.
 */
function SignOutSheet({ onConfirm, onCancel }) {
  const { t } = useLanguage();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label={t("common.close")}
        onClick={onCancel}
        className="absolute inset-0 bg-brown/50 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("profile.signOut.title")}
        className="relative flex flex-col overflow-hidden rounded-t-[28px] bg-ivory"
      >
        <div className="flex shrink-0 justify-center pb-2 pt-3">
          <span className="h-1 w-10 rounded-full bg-sandstone" />
        </div>

        <div className="space-y-4 px-5 pb-7">
          <div className="space-y-2">
            <h2 className="font-sans text-lg font-semibold text-brown">
              {t("profile.signOut.title")}
            </h2>
            <p className="font-sans text-sm font-light leading-relaxed text-ink-body">
              {t("profile.signOut.body")}
            </p>
            <p className="font-sans text-[13px] font-light leading-relaxed text-ink-muted">
              {t("profile.signOut.keeps")}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <PrimaryButton onClick={onConfirm}>
              {t("profile.signOut.confirm")}
            </PrimaryButton>
            <SecondaryButton onClick={onCancel}>
              {t("profile.signOut.cancel")}
            </SecondaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-2xl bg-ivory px-3.5 py-3 shadow-hairline">
      <span className="font-sans text-xl font-semibold tabular-nums text-brown">{value}</span>
      <span className="font-sans text-[11.5px] font-light text-ink-muted">{label}</span>
    </div>
  );
}

/**
 * Interleaves the export's inset divider between rows — and only between, so
 * a group never ends on a hairline. Rows stay dumb about their neighbours.
 */
function MenuGroup({ children }) {
  const rows = Children.toArray(children);
  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] bg-ivory shadow-hairline">
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <Divider /> : null}
          {row}
        </Fragment>
      ))}
    </div>
  );
}

/** The export insets the divider past the icon column. */
function Divider() {
  return <div className="ms-[49px] h-px bg-beige" />;
}

function MenuRow({ icon, label, value = null, onClick = null }) {
  const inner = (
    <>
      <span className="text-terracotta">{icon}</span>
      <span className="flex-1 truncate font-sans text-sm text-brown">{label}</span>
      {value != null && value !== "" ? (
        <span className="font-sans text-[13px] font-light tabular-nums text-ink-soft">
          {value}
        </span>
      ) : null}
      {onClick ? <Chevron /> : null}
    </>
  );
  if (!onClick) {
    return <div className="flex items-center gap-[13px] px-4 py-3.5">{inner}</div>;
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[13px] px-4 py-3.5 text-start active:bg-beige"
    >
      {inner}
    </button>
  );
}

/** A row from the design with nothing behind it yet, labelled as such. */
function InertRow({ icon, label }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-[13px] px-4 py-3.5 opacity-55">
      <span className="text-terracotta">{icon}</span>
      <span className="flex-1 truncate font-sans text-sm text-brown">{label}</span>
      <span className="shrink-0 rounded-full bg-beige px-2 py-0.5 font-sans text-[10px] font-medium text-ink-muted">
        {t("profile.notInBuild")}
      </span>
    </div>
  );
}

/* --- icons, traced from the export: 20px, stroke 1.7 ------------------- */

const ico = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Chevron() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-terracotta rtl:-scale-x-100"
    >
      <path d="m10 6.5 5.5 5.5L10 17.5" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg {...ico}>
      <path d="M12 20s-6.5-4.3-6.5-9A3.8 3.8 0 0 1 12 8.4a3.8 3.8 0 0 1 6.5 2.6c0 4.7-6.5 9-6.5 9Z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...ico}>
      <rect x="4" y="5.5" width="16" height="14" rx="3" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg {...ico}>
      <path d="m12 4.5 2.3 4.9 5.2.7-3.8 3.6 1 5.3-4.7-2.6-4.7 2.6 1-5.3-3.8-3.6 5.2-.7Z" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg {...ico}>
      <path d="M5 8h14l-1.2 11H6.2L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg {...ico}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c4 4.6 4 12.4 0 17-4-4.6-4-12.4 0-17Z" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg {...ico}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10.5 18.5a1.8 1.8 0 0 0 3 0" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg {...ico}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.8 9.6a2.3 2.3 0 1 1 3.1 2.2c-.6.3-.9.8-.9 1.4v.4M12 16.6v.2" />
    </svg>
  );
}
/** The ridge line screen 00 uses for the guide side. */
function RidgeIcon() {
  return (
    <svg {...ico}>
      <path d="M3 13.5 6.5 10l3 2.5 3-2.5 3 2.5L21 10" />
      <path d="M4.5 15.5c2 2.6 4.6 4 7.5 4s5.5-1.4 7.5-4" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg {...ico}>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M3.5 10.5h17" />
    </svg>
  );
}
