"""Camera-based AI tour guide: identifies a landmark from an image and narrates
it, grounded against the curated site knowledge base so responses stay
specific to Ma'an governorate rather than generic model knowledge.
"""
import base64
import json

import anthropic

from app.config import settings
from app.data.sites import SITES
from app.models import Language, VisionIdentifyResult

_KB_SUMMARY = "\n".join(
    f"- {s.id.value}: {s.name_en} / {s.name_ar} — {s.description_en}"
    for s in SITES.values()
)


def identify_landmark(image_bytes: bytes, media_type: str, language: Language) -> VisionIdentifyResult:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    lang_instruction = "Respond in Arabic." if language == Language.ar else "Respond in English."

    prompt = (
        "You are a tour guide for Ma'an governorate, Jordan. Identify which landmark in the "
        "photo matches one of the sites below, using ONLY the facts given here — do not invent "
        "details not grounded in this knowledge base. If nothing matches, say so.\n\n"
        f"Knowledge base:\n{_KB_SUMMARY}\n\n"
        f"{lang_instruction}\n"
        'Reply as JSON: {"site_id": "<id or null>", "landmark": "<name>", "narration": "<2-4 sentences>"}'
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
        parsed = {"site_id": None, "landmark": "Unknown", "narration": raw}

    site_id = parsed.get("site_id")
    return VisionIdentifyResult(
        site=site_id if site_id in SITES else None,
        landmark=parsed.get("landmark", "Unknown"),
        narration=parsed.get("narration", ""),
        language=language,
    )
