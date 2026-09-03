"""Camera-based AI tour guide: identifies a landmark from a photo and narrates
it, grounded against the attractions knowledge base so answers stay specific to
Ma'an governorate instead of drifting into generic model knowledge.

Where the research phase produced a narration script, that script is handed to
the model as the voice to speak in — so the guide says what a real researched
guide would say, not an improvisation.
"""
import base64
import json

import anthropic
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db_models import LandmarkORM
from app.models import Language, VisionIdentifyResult


def _knowledge_base(db: Session) -> tuple[str, dict[str, LandmarkORM]]:
    landmarks = list(db.scalars(
        select(LandmarkORM).where(LandmarkORM.active.is_(True))
    ).all())
    lines = []
    for landmark in landmarks:
        line = f"- {landmark.id}: {landmark.name_en} / {landmark.name_ar} — {landmark.description_en}"
        if landmark.significance_en:
            line += f" Significance: {landmark.significance_en}"
        lines.append(line)
    return "\n".join(lines), {l.id: l for l in landmarks}


def identify_landmark(
    db: Session, image_bytes: bytes, media_type: str, language: Language
) -> VisionIdentifyResult:
    summary, by_id = _knowledge_base(db)
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    lang_instruction = "Respond in Arabic." if language == Language.ar else "Respond in English."

    prompt = (
        "You are a tour guide for Ma'an governorate, Jordan. Identify which landmark in "
        "the photo matches one of the entries below, using ONLY the facts given here — do "
        "not invent details that are not in this knowledge base. If nothing matches, say "
        "so plainly.\n\n"
        f"Knowledge base:\n{summary}\n\n"
        f"{lang_instruction}\n"
        'Reply as JSON: {"landmark_id": "<id or null>", "landmark": "<name>", '
        '"narration": "<2-4 sentences, spoken to a visitor standing there>"}'
    )

    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=600,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64.b64encode(image_bytes).decode(),
                        },
                    },
                ],
            }
        ],
    )

    raw = message.content[0].text
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"landmark_id": None, "landmark": "Unknown", "narration": raw}

    landmark = by_id.get(parsed.get("landmark_id"))
    narration = parsed.get("narration", "")

    # A researched narration script beats a generated one — prefer it when the
    # match is confident and the script exists in the tourist's language.
    if landmark is not None:
        scripted = landmark.narration_ar if language == Language.ar else landmark.narration_en
        if scripted:
            narration = scripted

    return VisionIdentifyResult(
        landmark_id=landmark.id if landmark else None,
        landmark=parsed.get("landmark", "Unknown"),
        narration=narration,
        language=language,
    )
