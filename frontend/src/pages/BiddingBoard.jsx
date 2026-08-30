import { useState } from "react";

import { api } from "../api/client.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function BiddingBoard() {
  const { t } = useLanguage();
  const [requestId, setRequestId] = useState("");
  const [bids, setBids] = useState([]);

  const loadBids = async () => {
    if (!requestId) return;
    setBids(await api.listBids(requestId));
  };

  const accept = async (bidId) => {
    await api.acceptBid(bidId);
    await loadBids();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("bidding.title")}</h1>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          placeholder="req-xxxxxxxx"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
        />
        <button className="rounded bg-stone-900 px-4 py-2 text-white" onClick={loadBids}>
          Load
        </button>
      </div>

      <ul className="space-y-2">
        {bids.map((bid) => (
          <li
            key={bid.id}
            className={`flex items-center justify-between rounded border p-3 ${bid.accepted ? "border-green-600 bg-green-50" : ""}`}
          >
            <div>
              <div className="font-semibold">{bid.provider_id}</div>
              <div className="text-sm text-stone-600">
                {bid.price} JOD — {bid.message}
              </div>
            </div>
            {!bid.accepted && (
              <button
                className="rounded bg-stone-900 px-3 py-1 text-sm text-white"
                onClick={() => accept(bid.id)}
              >
                Accept
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
