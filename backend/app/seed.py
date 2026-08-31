"""Seeds the database from the current in-repo data files.

Run with: python -m app.seed

Idempotent — safe to re-run as landmarks.py/mock_providers.py are updated
during the data phase (see PLAN.md); existing rows are upserted, not
duplicated.
"""
from sqlalchemy.dialects.postgresql import insert

from app.data.landmarks import LANDMARKS
from app.data.mock_providers import MOCK_PROVIDERS
from app.db import Base, SessionLocal, engine
from app.db_models import LandmarkORM, ProviderORM


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
                {
                    "id": landmark.id,
                    "name_en": landmark.name_en,
                    "name_ar": landmark.name_ar,
                    "description_en": landmark.description_en,
                    "description_ar": landmark.description_ar,
                    "avg_visit_minutes": landmark.avg_visit_minutes,
                    "accessibility_notes": landmark.accessibility_notes,
                    "image_url": landmark.image_url,
                    "image_attribution": landmark.image_attribution,
                    "lat": landmark.lat,
                    "lon": landmark.lon,
                    "source_url": landmark.source_url,
                }
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
                }
                for provider in MOCK_PROVIDERS
            ],
        )

        session.commit()

    print(f"Seeded {len(LANDMARKS)} landmarks, {len(MOCK_PROVIDERS)} providers.")


if __name__ == "__main__":
    seed()
