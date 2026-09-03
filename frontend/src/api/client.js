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
  submitReview: (bookingId, payload) =>
    request(`/bookings/${bookingId}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  identifyLandmark: (formData) =>
    request("/vision/identify", { method: "POST", body: formData }),
  chat: (payload) => request("/chat", { method: "POST", body: JSON.stringify(payload) }),
};
