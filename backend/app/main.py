from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import bookings, chat, itinerary, landmarks, providers, vision

app = FastAPI(title="Maan Project API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(landmarks.router)
app.include_router(itinerary.router)
app.include_router(providers.router)
app.include_router(bookings.router)
app.include_router(vision.router)
app.include_router(chat.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
