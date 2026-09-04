"""Camera guide — identifies a monument from a photo and narrates it.

Uses OpenAI vision when OPENAI_API_KEY is set, falling back to Anthropic
otherwise, so a teammate with only the Anthropic key still has a working
camera.

Three modes, matching the design's switch:

  identify   what is this, and tell me about it
  frame      how should I shoot it
  sign       read the information board in the photo

All three are grounded in the same landmarks table the rest of the app uses.
The model is asked for JSON so the screen can show a real confidence score and
a real Arabic name rather than parsing prose.
"""
import base64
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db_models import LandmarkORM
from app.models import Language, VisionIdentifyResult, VisionMode

MAX_TOKENS = 900

# The catalogue the model must choose from. Compact on purpose: the vision call
# pays for these tokens on every shot, and identification only needs the id,
# both names and a one-line description to pick from.
def _catalogue(db: Session) -> str:
    rows = db.scalars(
        select(LandmarkORM)
        .where(LandmarkORM.active.is_(True))
        .order_by(LandmarkORM.parent_id.isnot(None), LandmarkORM.id)
    ).all()
    lines = []
    for row in rows:
        where = f" (inside {row.parent_id})" if row.parent_id else ""
        first_sentence = (row.description_en or "").split(". ")[0]
        lines.append(f"{row.id} | {row.name_en} | {row.name_ar}{where} — {first_sentence}")
    return "\n".join(lines)


BASE_RULES = """\
You are Terhal's camera guide for Ma'an governorate, Jordan. A visitor has \
pointed their phone at something and wants to know what it is.

Identify it ONLY as one of the places in the catalogue below. Match on what is \
actually visible — the shape of a facade, the number of storeys, an urn, a \
colonnade, a rock-cut stair. Do not guess from vibe.

If the photo is not one of these places — a different country, a person, a \
plate of food, a blurred wall — say so plainly and set matched to false. A \
confident wrong answer is worse than an honest "I cannot tell": someone is \
standing in front of the thing, and being told the wrong name is worse than \
being told to try again.

Be honest about confidence. Below about 55 you should be hedging in the \
narration itself, not just in the number.\
"""

MODE_RULES = {
    VisionMode.identify: """\
Task: identify and narrate.
- narration: 2-3 sentences, spoken aloud to someone standing there. One vivid, \
true detail beats three vague ones. Draw on the catalogue entry; do not invent \
history.
- framing_tip: one short sentence on how to get a better photo of it.\
""",
    VisionMode.frame: """\
Task: framing advice.
- Still identify the place if you can.
- narration: 2-3 sentences of concrete photographic advice for THIS shot — \
where to stand, which way the light is, what to include or crop out, what time \
of day is better. Refer to what you can actually see in the frame.
- framing_tip: the single most useful correction, in a few words.\
""",
    VisionMode.sign: """\
Task: read the sign. In THIS mode `matched` means "I found legible text and \
read it" — not "I recognised the place". Read the field that way and nothing \
else.
- Look for an information board, plaque, carved inscription or painted text. \
Transcribe what it actually says, then translate it into the requested \
language if it is in the other one.
- narration: the transcribed text, followed by a sentence of plain-language \
explanation if the sign is technical or archaeological.
- If the photo contains NO legible text — and a photograph of a monument \
usually does not — set matched to false, set confidence to 0, and say there is \
no sign in the frame. Do NOT describe the monument instead: the visitor asked \
what the sign says, and answering a different question is worse than saying \
there is nothing to read. Do not reconstruct a sign you cannot see.
- framing_tip: how to photograph a board more legibly, or where boards usually \
stand at this site.\
""",
}

SCHEMA_RULE = """\
Reply with JSON only, no prose around it, in exactly this shape:

{
  "landmark_id": "<id from the catalogue, or null>",
  "landmark": "<the display name, or a plain description of what you see>",
  "name_ar": "<the Arabic name from the catalogue, or null>",
  "subtitle": "<a short line: what kind of thing, when, where. Or null>",
  "narration": "<see the task above>",
  "framing_tip": "<one short sentence, or null>",
  "confidence": <integer 0-100>,
  "matched": <in identify and frame modes: true only if landmark_id is a real
              id from the catalogue. In sign mode: true only if you actually
              read legible text in the photo.>
}\
"""

LANG_RULE = {
    Language.ar: "Write narration, subtitle and framing_tip in Modern Standard Arabic.",
    Language.en: "Write narration, subtitle and framing_tip in English.",
}


def _prompt(db: Session, mode: VisionMode, language: Language) -> str:
    return (
        f"{BASE_RULES}\n\n{MODE_RULES[mode]}\n\n"
        f"{LANG_RULE.get(language, LANG_RULE[Language.en])}\n\n"
        f"{SCHEMA_RULE}\n\n# CATALOGUE\n{_catalogue(db)}"
    )


def _parse(raw: str) -> dict:
    """Pull the JSON object out of a reply, tolerating a code fence."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Rather than fail the request, hand the prose back as the narration and
        # let the screen show it un-matched.
        return {"landmark_id": None, "landmark": "", "narration": raw, "matched": False}


def _ask_openai(prompt: str, image_bytes: bytes, media_type: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    b64 = base64.b64encode(image_bytes).decode()
    response = client.chat.completions.create(
        model=settings.openai_vision_model,
        max_completion_tokens=MAX_TOKENS,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64}"},
                    },
                ],
            }
        ],
    )
    return response.choices[0].message.content or ""


def _ask_anthropic(prompt: str, image_bytes: bytes, media_type: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=MAX_TOKENS,
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
    return message.content[0].text


def identify_landmark(
    db: Session,
    image_bytes: bytes,
    media_type: str,
    language: Language,
    mode: VisionMode = VisionMode.identify,
) -> VisionIdentifyResult:
    prompt = _prompt(db, mode, language)

    if settings.openai_api_key:
        raw = _ask_openai(prompt, image_bytes, media_type)
    elif settings.anthropic_api_key:
        raw = _ask_anthropic(prompt, image_bytes, media_type)
    else:
        raise RuntimeError(
            "No vision provider configured — set OPENAI_API_KEY or "
            "ANTHROPIC_API_KEY in backend/.env"
        )

    parsed = _parse(raw)

    # Never trust the id: check it against the table before claiming a match.
    landmark = None
    landmark_id = parsed.get("landmark_id")
    if landmark_id:
        landmark = db.get(LandmarkORM, landmark_id)

    matched = bool(landmark) and bool(parsed.get("matched"))

    confidence = parsed.get("confidence")
    try:
        confidence = max(0, min(100, int(confidence)))
    except (TypeError, ValueError):
        confidence = None

    # A stop inside Petra is not separately bookable, so "Add to My Trip" has to
    # offer the parent — the place the deck and the itinerary actually carry.
    add_to_trip_id = None
    if landmark is not None:
        add_to_trip_id = landmark.parent_id or landmark.id

    return VisionIdentifyResult(
        landmark_id=landmark.id if landmark else None,
        landmark=(
            (landmark.name_ar if language == Language.ar else landmark.name_en)
            if landmark
            else (parsed.get("landmark") or "")
        ),
        name_ar=landmark.name_ar if landmark else parsed.get("name_ar"),
        subtitle=parsed.get("subtitle"),
        narration=parsed.get("narration") or "",
        framing_tip=parsed.get("framing_tip"),
        confidence=confidence,
        matched=matched,
        mode=mode,
        language=language,
        add_to_trip_id=add_to_trip_id,
    )
