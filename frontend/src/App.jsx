import { Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import BiddingBoard from "./pages/BiddingBoard.jsx";
import CameraGuide from "./pages/CameraGuide.jsx";
import ProviderDirectory from "./pages/ProviderDirectory.jsx";
import TripPlanner from "./pages/TripPlanner.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <main className="mx-auto max-w-4xl p-6">
        <Routes>
          <Route path="/" element={<TripPlanner />} />
          <Route path="/offers" element={<BiddingBoard />} />
          <Route path="/camera-guide" element={<CameraGuide />} />
          <Route path="/providers" element={<ProviderDirectory />} />
        </Routes>
      </main>
    </div>
  );
}
