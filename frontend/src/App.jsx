import { Route, Routes, useLocation } from "react-router-dom";

import { GuideTabBar } from "./components/GuideShell.jsx";
import { HomeIndicator, PhoneFrame, TabBar } from "./components/Shell.jsx";
import AdvisorProfile from "./pages/AdvisorProfile.jsx";
import Advisors from "./pages/Advisors.jsx";
import BookingConfirmed from "./pages/BookingConfirmed.jsx";
import Bookings from "./pages/Bookings.jsx";
import CameraGuide from "./pages/CameraGuide.jsx";
import Chat from "./pages/Chat.jsx";
import ChooseRole from "./pages/ChooseRole.jsx";
import Explore from "./pages/Explore.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Passport from "./pages/Passport.jsx";
import Profile from "./pages/Profile.jsx";
import PostTripReview from "./pages/PostTripReview.jsx";
import Splash from "./pages/Splash.jsx";
import Trip from "./pages/Trip.jsx";
import GuideCalendar from "./pages/guide/GuideCalendar.jsx";
import GuideEarnings from "./pages/guide/GuideEarnings.jsx";
import GuideOfferings from "./pages/guide/GuideOfferings.jsx";
import GuideProfile from "./pages/guide/GuideProfile.jsx";
import GuideRequests from "./pages/guide/GuideRequests.jsx";
import GuideSignIn from "./pages/guide/GuideSignIn.jsx";
import GuideToday from "./pages/guide/GuideToday.jsx";
import { useGuide } from "./state/GuideContext.jsx";

/**
 * Splash, the onboarding slides and the role question are pre-app: they own
 * the whole frame and draw their own home indicator, so the tab bar is
 * suppressed there. One prefix covers the slides and the role screen. Splash
 * is matched exactly rather than by prefix, since its path is "/".
 */
const CHROMELESS = ["/welcome"];

/**
 * The guide side is role-gated rather than a separate deployment: same build,
 * same API client, same theme and translation files. Everything under /guide
 * gets the GuideTabBar instead of the tourist one — different user, different
 * navigation — and nothing until an identity is chosen, since there is no
 * authentication in this product yet.
 */
function GuideRoutes() {
  const { providerId } = useGuide();
  if (!providerId) return <GuideSignIn />;
  return (
    <Routes>
      <Route index element={<GuideToday />} />
      <Route path="requests" element={<GuideRequests />} />
      <Route path="calendar" element={<GuideCalendar />} />
      <Route path="earnings" element={<GuideEarnings />} />
      <Route path="offerings" element={<GuideOfferings />} />
      <Route path="profile" element={<GuideProfile />} />
    </Routes>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isGuide = pathname.startsWith("/guide");
  const chromeless = pathname === "/" || CHROMELESS.some((p) => pathname.startsWith(p));

  return (
    <PhoneFrame>
      <Routes>
        <Route path="/welcome" element={<Onboarding />} />
        {/* Screen 00 — the last pre-app step, after the three slides. */}
        <Route path="/welcome/role" element={<ChooseRole />} />
        <Route path="/welcome/:step" element={<Onboarding />} />

        {/* Screen 01 is the app entry, per the design route table. */}
        <Route path="/" element={<Splash />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/trip" element={<Trip />} />
        <Route path="/passport" element={<Passport />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/advisors" element={<Advisors />} />
        <Route path="/advisors/:id" element={<AdvisorProfile />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingConfirmed />} />
        <Route path="/review/:id" element={<PostTripReview />} />
        <Route path="/camera" element={<CameraGuide />} />
        <Route path="/chat" element={<Chat />} />

        {/* The provider-facing half. */}
        <Route path="/guide/*" element={<GuideRoutes />} />
      </Routes>

      {chromeless ? null : (
        <>
          {isGuide ? <GuideTabBar /> : <TabBar />}
          <HomeIndicator />
        </>
      )}
    </PhoneFrame>
  );
}
