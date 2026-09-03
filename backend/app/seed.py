"""Seeds the database from the generated data files.

Run from backend/:  python -m app.seed

Idempotent — rows are upserted on their primary key, so re-running after
`python scripts/build_dataset.py` refreshes the content without duplicating
anything or disturbing itineraries and bookings made during a demo.
"""
from sqlalchemy.dialects.postgresql import insert

from app.data.landmarks import LANDMARKS
from app.data.mock_providers import MOCK_PROVIDERS
from app.db import Base, SessionLocal, engine
from app.db_models import LandmarkORM, ProviderORM

LANDMARK_COLUMNS = [
    "id", "name_en", "name_ar", "description_en", "description_ar",
    "avg_visit_minutes", "accessibility_notes", "image_url",
    "image_attribution", "lat", "lon", "source_url", "parent_id", "category",
    "history_en", "history_ar", "significance_en", "significance_ar",
    "narration_en", "narration_ar", "difficulty", "best_time_to_visit",
    "requires_guide", "entrance_fee_notes", "active",
]


def upsert(session, model, rows: list[dict]) -> None:
    if not rows:
        return
    stmt = insert(model).values(rows)
    update_cols = {c: stmt.excluded[c] for c in rows[0] if c != "id"}
    stmt = stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols)
    session.execute(stmt)


def seed() -> None:
    Base.metadata.create_all(engine)  # no-op if alembic already created the tables

    with SessionLocal() as session:
        upsert(
            session,
            LandmarkORM,
            [
                {column: getattr(landmark, column) for column in LANDMARK_COLUMNS}
                for landmark in LANDMARKS.values()
            ],
        )

        upsert(
            session,
            ProviderORM,
            [
                {
                    "id": provider.id,
                    "name": provider.name,
                    "role": provider.role.value,
                    "landmark_ids": provider.landmark_ids,
                    "languages": [lang.value for lang in provider.languages],
                    "rating": provider.rating,
                    "verified": provider.verified,
                    "welfare_compliant": provider.welfare_compliant,
                    "accessibility_tags": provider.accessibility_tags,
                    "lat": provider.lat,
                    "lon": provider.lon,
                    "hourly_rate_jod": provider.hourly_rate_jod,
                    "bio_en": provider.bio_en,
                    "bio_ar": provider.bio_ar,
                    "photo_url": provider.photo_url,
                }
                for provider in MOCK_PROVIDERS
            ],
        )

        session.commit()

    deck = sum(1 for landmark in LANDMARKS.values() if not landmark.parent_id)
    print(
        f"Seeded {len(LANDMARKS)} landmarks ({deck} top-level destinations) "
        f"and {len(MOCK_PROVIDERS)} providers."
    )


if __name__ == "__main__":
    seed()
