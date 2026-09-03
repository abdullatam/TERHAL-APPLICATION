from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import LandmarkORM
from app.models import Landmark

router = APIRouter(prefix="/landmarks", tags=["landmarks"])


@router.get("", response_model=list[Landmark])
def list_landmarks(
    deck: bool = False,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> list[LandmarkORM]:
    """`deck=true` returns only destinations in their own right — the cards the
    swipe deck shows. Everything with a parent (the Treasury, the Siq, ...) is a
    stop *inside* another place, so mixing them into the deck would let a tourist
    approve Petra and the Treasury as if they were alternatives."""
    query = select(LandmarkORM)
    if not include_inactive:
        query = query.where(LandmarkORM.active.is_(True))
    if deck:
        query = query.where(LandmarkORM.parent_id.is_(None))

    # Lead with the places people came for. Alphabetical order opens the deck on
    # an obscure hilltop ruin with no photograph, which is a poor first card and
    # — because swipe order doubles as priority when a trip is too short to fit
    # everything — would also let Petra be the stop that gets cut.
    return list(
        db.scalars(
            query.order_by(
                LandmarkORM.image_url.is_(None),      # photographed places first
                LandmarkORM.avg_visit_minutes.desc(),  # then the bigger days out
                LandmarkORM.id,
            )
        ).all()
    )


@router.get("/{landmark_id}", response_model=Landmark)
def get_landmark(landmark_id: str, db: Session = Depends(get_db)) -> LandmarkORM:
    landmark = db.get(LandmarkORM, landmark_id)
    if landmark is None:
        raise HTTPException(status_code=404, detail="Landmark not found")
    return landmark
