import { Route, Routes } from "react-router-dom";

import { PhoneFrame, TabBar } from "./components/Shell.jsx";
import AdvisorProfile from "./pages/AdvisorProfile.jsx";
import Advisors from "./pages/Advisors.jsx";
import BookingConfirmed from "./pages/BookingConfirmed.jsx";
import Bookings from "./pages/Bookings.jsx";
import CameraGuide from "./pages/CameraGuide.jsx";
import Chat from "./pages/Chat.jsx";
import Explore from "./pages/Explore.jsx";
import Trip from "./pages/Trip.jsx";

export default function App() {
  return (
    <PhoneFrame>
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/trip" element={<Trip />} />
        <Route path="/advisors" element={<Advisors />} />
        <Route path="/advisors/:id" element={<AdvisorProfile />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/:id" element={<BookingConfirmed />} />
        <Route path="/camera" element={<CameraGuide />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
      <TabBar />
    </PhoneFrame>
  );
}
