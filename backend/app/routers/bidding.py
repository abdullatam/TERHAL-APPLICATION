from fastapi import APIRouter, HTTPException

from app.data.landmarks import LANDMARKS
from app.models import Bid, BidCreate, TripRequest, TripRequestCreate
from app.store import store

router = APIRouter(tags=["bidding"])


@router.post("/requests", response_model=TripRequest)
def create_request(payload: TripRequestCreate) -> TripRequest:
    if payload.itinerary_id not in store.itineraries:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    if payload.landmark_id not in LANDMARKS:
        raise HTTPException(status_code=404, detail="Landmark not found")
    trip_request = TripRequest(id=store.new_id("req"), **payload.model_dump())
    store.requests[trip_request.id] = trip_request
    return trip_request


@router.get("/requests/{request_id}", response_model=TripRequest)
def get_request(request_id: str) -> TripRequest:
    trip_request = store.requests.get(request_id)
    if not trip_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return trip_request


@router.post("/requests/{request_id}/bids", response_model=Bid)
def submit_bid(request_id: str, payload: BidCreate) -> Bid:
    if request_id not in store.requests:
        raise HTTPException(status_code=404, detail="Request not found")
    if payload.provider_id not in store.providers:
        raise HTTPException(status_code=404, detail="Provider not found")
    bid = Bid(id=store.new_id("bid"), request_id=request_id, **payload.model_dump())
    store.bids[bid.id] = bid
    return bid


@router.get("/requests/{request_id}/bids", response_model=list[Bid])
def list_bids(request_id: str) -> list[Bid]:
    return [b for b in store.bids.values() if b.request_id == request_id]


@router.post("/bids/{bid_id}/accept", response_model=Bid)
def accept_bid(bid_id: str) -> Bid:
    bid = store.bids.get(bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    bid.accepted = True
    for other in store.bids.values():
        if other.request_id == bid.request_id and other.id != bid.id:
            other.accepted = False
    return bid
