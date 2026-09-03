import { Route, Routes, useLocation } from "react-router-dom";

import { HomeIndicator, PhoneFrame, TabBar } from "./components/Shell.jsx";
import AdvisorProfile from "./pages/AdvisorProfile.jsx";
import Advisors from "./pages/Advisors.jsx";
import BookingConfirmed from "./pages/BookingConfirmed.jsx";
import Bookings from "./pages/Bookings.jsx";
import CameraGuide from "./pages/CameraGuide.jsx";
import Chat from "./pages/Chat.jsx";
import Explore from "./pages/Explore.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Passport from "./pages/Passport.jsx";
import Profile from "./pages/Profile.jsx";
import PostTripReview from "./pages/PostTripReview.jsx";
import Splash from "./pages/Splash.jsx";
import Trip from "./pages/Trip.jsx";

/**
 * Splash and onboarding are pre-app: they own the whole frame and draw their
 * own home indicator, so the tab bar is suppressed there.
 */
const CHROMELESS = ["/splash", "/welcome"];

export default function App() {
  const { pathname } = useLocation();
  const chromeless = CHROMELESS.some((p) => pathname.startsWith(p));

  return (
    <PhoneFrame>
      <Routes>
        <Route path="/splash" element={<Splash />} />
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/welcome/:step" element={<Onboarding />} />

        <Route path="/" element={<Explore />} />
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
      </Routes>

      {chromeless ? null : (
        <>
          <TabBar />
          <HomeIndicator />
        </>
      )}
    </PhoneFrame>
  );
}
