import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { HeaderAction, StatusBar, TopBar } from "../components/Shell.jsx";
import {
  Avatar,
  Badge,
  EmptyState,
  FilterPill,
  Segmented,
  Spinner,
} from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useTrip } from "../state/TripContext.jsx";

import "leaflet/dist/leaflet.css";

// Wadi Musa town centre. The demo will not be running in Jordan, so this is
// the position the app uses until someone explicitly asks for real GPS.
const DEMO_POSITION = { lat: 30.3216, lon: 35.48 };
const ROLES = ["all", "guide", "driver", "vendor", "animal_operator"];

/**
 * Advisors — screen 12. Visuals rebuilt (Terhal list rows, terracotta price
 * pins, segmented list/map switch); the providers fetch, the itinerary-derived
 * `hours`, geolocation and filtering are carried over unchanged.
 */
export default function Advisors() {
  const { t } = useLanguage();
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
    <div className="relative flex min-h-0 flex-1 flex-col">
      <StatusBar />
      <TopBar
        title={t("advisors.title")}
        subtitle={
          providers
            ? t("advisors.nearCount", {
                n: providers.length,
                place: usingRealLocation ? t("advisors.you") : "Wadi Musa",
              })
            : t("advisors.subtitle")
        }
        showIcon
        action={
          <HeaderAction label={t("booking.viewAll")} onClick={() => navigate("/bookings")}>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="5" width="16" height="15" rx="3" />
              <path d="M8 3.5v3M16 3.5v3M4 10h16" />
            </svg>
          </HeaderAction>
        }
      />

      <div className="shrink-0 space-y-2.5 px-[22px] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-[132px]">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: t("advisors.list") },
                { value: "map", label: t("advisors.map") },
              ]}
            />
          </div>
          <button
            onClick={locate}
            disabled={locating}
            className="ms-auto truncate rounded-full bg-beige px-3 py-2 font-sans text-[11px] font-medium text-ink-muted active:bg-sandstone/40"
          >
            {locating
              ? t("advisors.locating")
              : usingRealLocation
                ? t("advisors.useMyLocation")
                : t("advisors.demoLocation")}
          </button>
        </div>

        <div className="no-scrollbar -mx-[22px] flex gap-1.5 overflow-x-auto px-[22px]">
          {ROLES.map((value) => (
            <FilterPill key={value} active={role === value} onClick={() => setRole(value)}>
              {t(`advisors.${value}`)}
            </FilterPill>
          ))}
          <FilterPill
            active={verifiedOnly}
            onClick={() => setVerifiedOnly((v) => !v)}
          >
            {t("advisors.verifiedOnly")}
          </FilterPill>
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
        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-[22px] pb-2">
          {providers.map((provider) => (
            <li key={provider.id}>
              <button
                onClick={() => navigate(`/advisors/${provider.id}?hours=${hours}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-ivory p-3.5 text-start shadow-hairline active:bg-beige"
              >
                <Avatar name={provider.name} url={provider.photo_url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-sans text-[14.5px] font-medium text-brown">
                      {provider.name}
                    </p>
                    {provider.verified ? <VerifiedMark /> : null}
                  </div>
                  <p className="truncate font-sans text-xs font-light text-ink-muted">
                    {t(`advisors.${provider.role}`)}
                    {provider.distance_km != null
                      ? ` · ${t("advisors.away", { n: provider.distance_km })}`
                      : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="font-sans text-xs font-medium text-brown">
                      ★ {provider.rating}
                    </span>
                    {provider.welfare_compliant ? (
                      <Badge>{t("provider.welfare")}</Badge>
                    ) : null}
                    {provider.accessibility_tags?.length ? (
                      <Badge>{t("provider.accessible")}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-end">
                  <div className="font-sans text-[15px] font-semibold tabular-nums text-terracotta">
                    {provider.quote.total_jod.toFixed(0)}
                  </div>
                  <div className="font-sans text-[10px] text-ink-soft">{t("price.jod")}</div>
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
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-terracotta"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-1 2.8 1 2.8-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l1-2.8-1-2.8 2.6-1.5 1-2.8 3 .3z" />
      <path d="M10.6 15.2l-2.8-2.8 1.3-1.3 1.5 1.5 4-4 1.3 1.3z" fill="#FAF6F2" />
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
              icon={priceIcon(provider, t("price.jod"))}
              eventHandlers={{ click: () => onSelect(provider) }}
            />
          ))}
      </MapContainer>
      <p className="pointer-events-none absolute bottom-1 end-1 z-[500] rounded bg-ivory/80 px-1.5 py-0.5 font-sans text-[9px] text-ink-soft">
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
// useful than a pin anyway — so both markers are plain HTML in brand colours.
function priceIcon(provider, jod) {
  return L.divIcon({
    className: "",
    html: `<div style="
      transform:translate(-50%,-100%);
      background:#B2543A;color:#FAF6F2;font:600 12px/1 Poppins,ui-sans-serif,system-ui;
      padding:6px 9px;border-radius:999px;white-space:nowrap;
      box-shadow:0 4px 12px rgba(58,42,33,.35);border:2px solid #FAF6F2;">
      ${provider.quote.total_jod.toFixed(0)} ${jod}
    </div>`,
    iconSize: [0, 0],
  });
}

function youIcon(label) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;">
      <span style="width:16px;height:16px;border-radius:50%;background:#3A2A21;
        border:3px solid #FAF6F2;box-shadow:0 0 0 4px rgba(58,42,33,.2);"></span>
      <span style="background:#FAF6F2;padding:2px 6px;border-radius:6px;
        font:600 11px/1 Poppins,ui-sans-serif,system-ui;color:#3A2A21;
        box-shadow:0 2px 6px rgba(58,42,33,.2);">${label}</span>
    </div>`,
    iconSize: [0, 0],
  });
}
