"""Bilingual AI visitor assistant, grounded in the attractions knowledge base."""
import anthropic
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db_models import LandmarkORM
from app.models import Language


def _knowledge_base(db: Session) -> str:
    landmarks = db.scalars(
        select(LandmarkORM).where(LandmarkORM.active.is_(True))
    ).all()
    return "\n".join(
        f"- {l.id}: {l.name_en} / {l.name_ar} — {l.description_en} "
        f"(visit ~{l.avg_visit_minutes} min; accessibility: {l.accessibility_notes})"
        for l in landmarks
    )


def ask(db: Session, question: str, language: Language) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    lang_instruction = "Respond in Arabic." if language == Language.ar else "Respond in English."

    prompt = (
        "You are a bilingual visitor assistant for Ma'an governorate, Jordan. Answer "
        "from the knowledge base below where it is relevant, and say when something is "
        "outside what you know rather than guessing.\n\n"
        f"Knowledge base:\n{_knowledge_base(db)}\n\n"
        f"{lang_instruction}\n\nVisitor question: {question}"
    )

    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
