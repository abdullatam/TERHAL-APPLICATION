"""Bilingual AI chat assistant — fallback AI feature if the camera guide proves
too heavy to finish reliably. Grounds answers in the attractions knowledge base.
"""
import anthropic

from app.config import settings
from app.data.landmarks import LANDMARKS
from app.models import Language

_KB_SUMMARY = "\n".join(
    f"- {l.id}: {l.name_en} / {l.name_ar} — {l.description_en} (accessibility: {l.accessibility_notes})"
    for l in LANDMARKS.values()
)


def ask(question: str, language: Language) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    lang_instruction = "Respond in Arabic." if language == Language.ar else "Respond in English."

    prompt = (
        "You are a bilingual visitor assistant for Ma'an governorate, Jordan. Answer using the "
        f"knowledge base below when relevant.\n\nKnowledge base:\n{_KB_SUMMARY}\n\n"
        f"{lang_instruction}\n\nVisitor question: {question}"
    )

    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
