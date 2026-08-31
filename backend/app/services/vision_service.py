"""Camera-based AI tour guide: identifies a landmark from an image and narrates
it, grounded against the curated site knowledge base so responses stay
specific to Ma'an governorate rather than generic model knowledge.
"""
import base64
import json

import anthropic

from app.config import settings
from app.data.landmarks import LANDMARKS
from app.models import Language, VisionIdentifyResult

_KB_SUMMARY = "\n".join(
    f"- {l.id} ({l.site.value}): {l.name_en} / {l.name_ar} — {l.description_en}"
    for l in LANDMARKS.values()
)


def identify_landmark(image_bytes: bytes, media_type: str, language: Language) -> VisionIdentifyResult:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    lang_instruction = "Respond in Arabic." if language == Language.ar else "Respond in English."

    prompt = (
        "You are a tour guide for Ma'an governorate, Jordan. Identify which landmark in the "
        "photo matches one of the entries below, using ONLY the facts given here — do not "
        "invent details not grounded in this knowledge base. If nothing matches, say so.\n\n"
        f"Knowledge base:\n{_KB_SUMMARY}\n\n"
        f"{lang_instruction}\n"
        'Reply as JSON: {"landmark_id": "<id or null>", "landmark": "<name>", "narration": "<2-4 sentences>"}'
    )

    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=500,
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

    landmark = LANDMARKS.get(parsed.get("landmark_id"))
    return VisionIdentifyResult(
        site=landmark.site if landmark else None,
        landmark=parsed.get("landmark", "Unknown"),
        narration=parsed.get("narration", ""),
        language=language,
    )
