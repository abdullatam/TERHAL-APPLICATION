"""Bilingual AI chat assistant — fallback AI feature if the camera guide proves
too heavy to finish reliably. Grounds answers in the site knowledge base.
"""
import anthropic

from app.config import settings
from app.data.sites import SITES
from app.models import Language

_KB_SUMMARY = "\n".join(
    f"- {s.id.value}: {s.name_en} / {s.name_ar} — {s.description_en} (accessibility: {s.accessibility_notes})"
    for s in SITES.values()
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
