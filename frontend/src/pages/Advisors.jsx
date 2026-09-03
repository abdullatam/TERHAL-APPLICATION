import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import { Avatar, Badge, EmptyState, Spinner } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

import "leaflet/dist/leaflet.css";

// Wadi Musa town centre. The demo will not be running in Jordan, so this is
// the position the app uses until someone explicitly asks for real GPS.
const DEMO_POSITION = { lat: 30.3216, lon: 35.48 };
const ROLES = ["all", "guide", "driver", "vendor", "animal_operator"];

export default function Advisors() {
  const { t, language, pick } = useLanguage();
  const navigate = useNavigate();
  const { itinerary } = useTrip();

  const [view, setView] = useState("list");
  const [role, setRole] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [position, setPosition] = useState(DEMO_POSITION);
  const [usingRealLocation, setUsingRealLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [providers, setProviders] = useState(null);
  const [error, setError] = useState(null);

  // Quote the trip the tourist actually planned: day one's visiting hours.
  const hours = useMemo(() => {
    const firstDay = itinerary?.days?.[0];
    if (!firstDay) return 4;
    const minutes = firstDay.stops.reduce((sum, s) => sum + s.duration_minutes, 0);
    return Math.min(12, Math.max(1, Math.round(minutes / 60)));
  }, [itinerary]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api
      .providers({
        near: `${position.lat},${position.lon}`,
        role: role === "all" ? undefined : role,
        verified_only: verifiedOnly,
        hours,
        group_size: 2,
      })
      .then((data) => !cancelled && setProviders(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [position, role, verifiedOnly, hours]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setUsingRealLocation(true);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title={t("advisors.title")}
        subtitle={t("advisors.subtitle")}
        right={
          <button
            onClick={() => navigate("/bookings")}
            className="shrink-0 rounded-full border border-sand-300 px-3 py-1.5 text-xs font-semibold text-sand-700 active:bg-sand-100"
          >
            {t("booking.viewAll")}
          </button>
        }
      />

      <div className="shrink-0 space-y-2 border-b border-sand-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-sand-100 p-0.5">
            {["list", "map"].map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  view === mode ? "bg-white text-sand-900 shadow-sm" : "text-sand-500"
                }`}
              >
                {t(`advisors.${mode}`)}
              </button>
            ))}
          </div>

          <button
            onClick={locate}
            disabled={locating}
            className="ms-auto truncate rounded-full border border-sand-300 px-3 py-1.5 text-[11px] font-medium text-sand-600 active:bg-sand-100"
          >
            {locating
              ? t("advisors.locating")
              : usingRealLocation
                ? t("advisors.useMyLocation")
                : t("advisors.demoLocation")}
          </button>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {ROLES.map((value) => (
            <button
              key={value}
              onClick={() => setRole(value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                role === value ? "bg-sand-800 text-white" : "bg-sand-100 text-sand-600"
              }`}
            >
              {t(`advisors.${value}`)}
            </button>
          ))}
          <button
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              verifiedOnly ? "bg-emerald-600 text-white" : "bg-sand-100 text-sand-600"
            }`}
          >
            {t("advisors.verifiedOnly")}
          </button>
        </div>
      </div>

      {error ? (
        <EmptyState title={t("common.offline")} body={error} />
      ) : !providers ? (
        <Spinner label={t("common.loading")} />
      ) : providers.length === 0 ? (
        <EmptyState title={t("advisors.none")} />
      ) : view === "map" ? (
        <MapView
          providers={providers}
          position={position}
          onSelect={(p) => navigate(`/advisors/${p.id}?hours=${hours}`)}
        />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-sand-200 overflow-y-auto">
          {providers.map((provider) => (
            <li key={provider.id}>
              <button
                onClick={() => navigate(`/advisors/${provider.id}?hours=${hours}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start active:bg-sand-100"
              >
                <Avatar name={provider.name} url={provider.photo_url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-sand-900">{provider.name}</p>
                    {provider.verified ? <VerifiedMark /> : null}
                  </div>
                  <p className="truncate text-xs text-sand-500">
                    {t(`advisors.${provider.role}`)} · ★ {provider.rating}
                    {provider.distance_km != null
                      ? ` · ${t("advisors.away", { n: provider.distance_km })}`
                      : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {provider.welfare_compliant ? (
                      <Badge tone="blue">{t("provider.welfare")}</Badge>
                    ) : null}
                    {provider.accessibility_tags?.length ? (
                      <Badge tone="green">{t("provider.accessible")}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-end">
                  <div className="font-bold tabular-nums text-sand-900">
                    {provider.quote.total_jod.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-sand-400">JOD</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VerifiedMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-600" fill="currentColor">
      <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-1 2.8 1 2.8-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l1-2.8-1-2.8 2.6-1.5 1-2.8 3 .3z" />
      <path d="M10.6 15.2l-2.8-2.8 1.3-1.3 1.5 1.5 4-4 1.3 1.3z" fill="#fff" />
    </svg>
  );
}

function MapView({ providers, position, onSelect }) {
  const { t } = useLanguage();
  const center = [position.lat, position.lon];

  return (
    <div className="relative min-h-0 flex-1">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <Recenter center={center} />

        <Marker position={center} icon={youIcon(t("advisors.you"))} />

        {providers
          .filter((p) => p.lat != null && p.lon != null)
          .map((provider) => (
            <Marker
              key={provider.id}
              position={[provider.lat, provider.lon]}
              icon={priceIcon(provider)}
              eventHandlers={{ click: () => onSelect(provider) }}
            />
          ))}
      </MapContainer>

      <p className="pointer-events-none absolute bottom-1 end-1 z-[500] rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-sand-500">
        © OpenStreetMap
      </p>
    </div>
  );
}

/** Keeps the viewport on the tourist when their position changes. */
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Leaflet's default marker images break under bundlers, and a price is more
// useful than a pin anyway — so both markers are plain HTML.
function priceIcon(provider) {
  return L.divIcon({
    className: "",
    html: `<div style="
      transform:translate(-50%,-100%);
      background:#B2543A;color:#fff;font:600 12px/1 ui-sans-serif,system-ui;
      padding:6px 9px;border-radius:999px;white-space:nowrap;
      box-shadow:0 4px 12px rgba(0,0,0,.3);border:2px solid #fff;">
      ${provider.quote.total_jod.toFixed(0)} JOD
    </div>`,
    iconSize: [0, 0],
  });
}

function youIcon(label) {
  return L.divIcon({
    className: "",
    html: `<div style="
      transform:translate(-50%,-50%);
      display:flex;align-items:center;gap:6px;">
      <span style="width:16px;height:16px;border-radius:50%;background:#2563eb;
        border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25);"></span>
      <span style="background:#fff;padding:2px 6px;border-radius:6px;
        font:600 11px/1 ui-sans-serif,system-ui;color:#2B221A;
        box-shadow:0 2px 6px rgba(0,0,0,.2);">${label}</span>
    </div>`,
    iconSize: [0, 0],
  });
}
