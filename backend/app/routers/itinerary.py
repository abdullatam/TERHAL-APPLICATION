from fastapi import APIRouter, HTTPException

from app.models import Itinerary, ItineraryRequest
from app.services.itinerary_service import generate_itinerary
from app.store import store

router = APIRouter(prefix="/itinerary", tags=["itinerary"])


@router.post("/generate", response_model=Itinerary)
def create_itinerary(req: ItineraryRequest) -> Itinerary:
    return generate_itinerary(req)


@router.get("/{itinerary_id}", response_model=Itinerary)
def get_itinerary(itinerary_id: str) -> Itinerary:
    itinerary = store.itineraries.get(itinerary_id)
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return itinerary
