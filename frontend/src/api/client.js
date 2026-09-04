const BASE_URL = "/api";

async function request(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: isForm ? options.headers : { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    const error = new Error(detail || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  // 204 has no body, and several guide endpoints use it for deletes.
  if (res.status === 204) return null;
  return res.json();
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== false) {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  /** Top-level destinations only — the swipe deck. */
  deck: () => request(`/landmarks${query({ deck: true })}`),
  landmarks: () => request("/landmarks"),
  landmark: (id) => request(`/landmarks/${id}`),

  buildItinerary: (payload) =>
    request("/itinerary/from-selection", { method: "POST", body: JSON.stringify(payload) }),
  itinerary: (id) => request(`/itinerary/${id}`),

  providers: (params) => request(`/providers${query(params)}`),
  provider: (id, params) => request(`/providers/${id}${query(params)}`),

  createBooking: (payload) =>
    request("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  bookings: () => request("/bookings"),
  booking: (id) => request(`/bookings/${id}`),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: "POST" }),

  /** Ma'an Passport — derived server-side from booking history. */
  passport: () => request("/passport"),

  /** Marketplace makers. `items_pending` is true until products are modelled. */
  marketplace: (params) => request(`/marketplace${query(params)}`),

  review: (bookingId) => request(`/bookings/${bookingId}/review`),
  /** Every review written. No auth yet, so this is "mine" by default. */
  reviews: () => request("/reviews"),
  submitReview: (bookingId, payload) =>
    request(`/bookings/${bookingId}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // --- guide app (provider-facing). Same backend, same tables. -------------
  // provider_id is passed explicitly because this product has no auth yet;
  // when it lands, these lose the argument and read it from the session.
  guideProviders: () => request("/guide/providers"),
  guideToday: (id) => request(`/guide/${id}/today`),
  guideRequests: (id, bucket) => request(`/guide/${id}/requests${query({ bucket })}`),
  guideAccept: (id, bookingId) =>
    request(`/guide/${id}/requests/${bookingId}/accept`, { method: "POST" }),
  guideDecline: (id, bookingId) =>
    request(`/guide/${id}/requests/${bookingId}/decline`, { method: "POST" }),
  guideCalendar: (id, month) => request(`/guide/${id}/calendar${query({ month })}`),
  guideAvailability: (id, month) => request(`/guide/${id}/availability${query({ month })}`),
  guideBlock: (id, payload) =>
    request(`/guide/${id}/availability`, { method: "POST", body: JSON.stringify(payload) }),
  guideUnblock: (id, blockId) =>
    request(`/guide/${id}/availability/${blockId}`, { method: "DELETE" }),
  guideEarnings: (id) => request(`/guide/${id}/earnings`),
  guideOfferings: (id) => request(`/guide/${id}/offerings`),
  guideCreateOffering: (id, payload) =>
    request(`/guide/${id}/offerings`, { method: "POST", body: JSON.stringify(payload) }),
  guideUpdateOffering: (id, offeringId, payload) =>
    request(`/guide/${id}/offerings/${offeringId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  guideDeleteOffering: (id, offeringId) =>
    request(`/guide/${id}/offerings/${offeringId}`, { method: "DELETE" }),
  guideProfile: (id) => request(`/guide/${id}/profile`),
  guideUpdateProfile: (id, payload) =>
    request(`/guide/${id}/profile`, { method: "PATCH", body: JSON.stringify(payload) }),

  identifyLandmark: (formData) =>
    request("/vision/identify", { method: "POST", body: formData }),
  chat: (payload) => request("/chat", { method: "POST", body: JSON.stringify(payload) }),
};
