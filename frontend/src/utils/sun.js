/**
 * Golden hour, computed rather than invented.
 *
 * The camera guide's export shows a "Golden hour · 34 min left" chip. That
 * number is the one thing on the screen a photographer would actually act on,
 * so it has to be real — a hard-coded 34 would be wrong within the minute.
 *
 * This is the standard NOAA/SunCalc solar-position solution, cut down to the
 * two altitudes the chip needs: -0.833° (sunset, allowing for refraction and
 * the sun's radius) and +6° (the conventional edge of golden hour).
 *
 * Position is fixed to Petra. Sunset across the whole of Ma'an governorate
 * varies by under two minutes, so one reference point is accurate everywhere
 * the app is meant to be used, and it avoids putting a geolocation permission
 * prompt in front of someone mid-demo.
 */
const RAD = Math.PI / 180;

export const PETRA = { lat: 30.3285, lon: 35.4444 };

/** Minutes either side of the boundary that count as golden hour. */
const GOLDEN_ALTITUDE = 6;
const SUNSET_ALTITUDE = -0.833;

const J1970 = 2440588;
const J2000 = 2451545;
const DAY_MS = 86400000;

const toJulian = (date) => date.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = (j) => new Date((j + 0.5 - J1970) * DAY_MS);
const toDays = (date) => toJulian(date) - J2000;

const solarMeanAnomaly = (d) => RAD * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M) {
  // Equation of centre + longitude of perihelion.
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + RAD * 102.9372 + Math.PI;
}

const declination = (L) => Math.asin(Math.sin(RAD * 23.4397) * Math.sin(L));

const J0 = 0.0009;
const julianCycle = (d, lw) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds, M, L) =>
  J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

function hourAngle(altitude, phi, dec) {
  const cosH =
    (Math.sin(RAD * altitude) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  // Clamped for the polar case, where the sun never reaches the altitude at
  // all. Ma'an never hits it, but an unclamped acos would return NaN and take
  // the whole chip down with it.
  return Math.acos(Math.max(-1, Math.min(1, cosH)));
}

/**
 * Sunrise, sunset and both golden-hour boundaries for one calendar day.
 * All four are absolute instants, so "minutes from now" is correct whatever
 * timezone the device is in.
 */
export function sunTimes(date, { lat, lon } = PETRA) {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const noon = solarTransitJ(ds, M, L);

  // Descending crossing of an altitude; the matching ascending one is the
  // same interval on the other side of solar noon.
  const setting = (altitude) =>
    solarTransitJ(approxTransit(hourAngle(altitude, phi, dec), lw, n), M, L);
  const rising = (altitude) => noon * 2 - setting(altitude);

  return {
    sunrise: fromJulian(rising(SUNSET_ALTITUDE)),
    morningGoldenEnd: fromJulian(rising(GOLDEN_ALTITUDE)),
    eveningGoldenStart: fromJulian(setting(GOLDEN_ALTITUDE)),
    sunset: fromJulian(setting(SUNSET_ALTITUDE)),
  };
}

/**
 * What the chip should say right now.
 *
 * `{ active: true, minutesLeft }` inside a golden hour, otherwise
 * `{ active: false, startsAt }` for the next one — today's evening window if
 * it hasn't started, else tomorrow morning's.
 */
export function goldenHour(now = new Date(), position = PETRA) {
  const today = sunTimes(now, position);
  const windows = [
    [today.sunrise, today.morningGoldenEnd],
    [today.eveningGoldenStart, today.sunset],
  ];

  for (const [start, end] of windows) {
    if (now >= start && now <= end) {
      return { active: true, minutesLeft: Math.max(1, Math.round((end - now) / 60000)) };
    }
    if (now < start) return { active: false, startsAt: start };
  }

  // Past sunset: the next window is tomorrow's sunrise.
  const tomorrow = sunTimes(new Date(now.valueOf() + DAY_MS), position);
  return { active: false, startsAt: tomorrow.sunrise };
}
