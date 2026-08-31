import { useState } from "react";

import { api } from "../api/client.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function TripPlanner() {
  const { t, language } = useLanguage();
  const [interests, setInterests] = useState("history, hiking");
  const [days, setDays] = useState(2);
  const [accessibility, setAccessibility] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await api.generateItinerary({
        interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
        trip_days: Number(days),
        accessibility_needs: accessibility,
        language,
      });
      setItinerary(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("planner.title")}</h1>

      <label className="block">
        <span className="text-sm font-medium">{t("planner.interests")}</span>
        <input
          className="mt-1 w-full rounded border p-2"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{t("planner.days")}</span>
        <input
          type="number"
          min={1}
          max={14}
          className="mt-1 w-24 rounded border p-2"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={accessibility}
          onChange={(e) => setAccessibility(e.target.checked)}
        />
        <span className="text-sm">{t("planner.accessibility")}</span>
      </label>

      <button
        className="rounded bg-stone-900 px-4 py-2 text-white disabled:opacity-50"
        onClick={handleGenerate}
        disabled={loading}
      >
        {t("planner.generate")}
      </button>

      {itinerary && (
        <ol className="mt-6 space-y-2">
          {itinerary.stops.map((stop) => (
            <li key={stop.order} className="rounded border p-3">
              <div className="font-semibold">
                {stop.order}. {stop.landmark_id} — {stop.start_time} ({stop.duration_minutes} min)
              </div>
              {stop.notes && <div className="text-sm text-stone-600">{stop.notes}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
