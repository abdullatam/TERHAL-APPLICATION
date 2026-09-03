from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Language, VisionIdentifyResult
from app.services.vision_service import identify_landmark

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/identify", response_model=VisionIdentifyResult)
async def identify(
    image: UploadFile = File(...),
    language: Language = Form(Language.en),
    db: Session = Depends(get_db),
) -> VisionIdentifyResult:
    image_bytes = await image.read()
    media_type = image.content_type or "image/jpeg"
    return identify_landmark(db, image_bytes, media_type, language)
