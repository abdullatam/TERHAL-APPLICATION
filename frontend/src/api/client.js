const BASE_URL = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

export const api = {
  listLandmarks: () => request("/landmarks"),
  generateItinerary: (payload) =>
    request("/itinerary/generate", { method: "POST", body: JSON.stringify(payload) }),
  listProviders: (landmarkId) =>
    request(`/providers${landmarkId ? `?landmark_id=${landmarkId}` : ""}`),
  createRequest: (payload) =>
    request("/requests", { method: "POST", body: JSON.stringify(payload) }),
  listBids: (requestId) => request(`/requests/${requestId}/bids`),
  submitBid: (requestId, payload) =>
    request(`/requests/${requestId}/bids`, { method: "POST", body: JSON.stringify(payload) }),
  acceptBid: (bidId) => request(`/bids/${bidId}/accept`, { method: "POST" }),
  identifyLandmark: (formData) => request("/vision/identify", { method: "POST", body: formData }),
  chat: (payload) => request("/chat", { method: "POST", body: JSON.stringify(payload) }),
};
