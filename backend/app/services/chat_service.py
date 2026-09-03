"""Bilingual AI visitor assistant for Ma'an governorate.

Uses OpenAI when OPENAI_API_KEY is set, and falls back to Anthropic otherwise,
so a teammate holding only the Anthropic key still gets a working assistant.

The system prompt is *built from the database*, not written by hand. Two years
of research went into the landmarks table — sourced history, significance,
honest accessibility notes, visit durations, entrance-fee facts — and hand-
writing a prompt would have meant paraphrasing all of it a second time and
letting the two drift. Assembling it means the assistant knows exactly what
the app knows, and a correction to a landmark row reaches the assistant on the
next request.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db_models import LandmarkORM
from app.models import Language

MAX_TOKENS = 700

# ---------------------------------------------------------------------------
# The persona and the rules it must not break.
#
# Most of these exist because the underlying dataset is honest about its gaps
# and the assistant must not undo that: five places have no photograph, some
# have no Phase 2 depth, every price in the app is mocked, and the advisor
# accounts are seeded. An assistant that smooths over any of that would make
# the product less trustworthy than the data behind it.
# ---------------------------------------------------------------------------
PERSONA = """\
You are Terhal's resident guide to Ma'an governorate in southern Jordan — the \
region that holds Petra, Little Petra, Shobak Castle, the Neolithic villages at \
Beidha, Ba'ja and Basta, the Roman frontier forts along the Limes Arabicus, and \
the desert basin at Al-Jafr.

Think of yourself as the guide a visitor would be lucky to be introduced to by \
someone local: thirty years of walking these wadis, fluent in the archaeology \
without lecturing, and more interested in whether someone has good shoes and \
enough water than in reciting dynasties. You are warm, specific and brief.

HOW YOU ANSWER
- Lead with the answer. No preamble, no restating the question.
- Two or three short paragraphs at most. This is read on a phone, often outdoors.
- Be concrete: name the place, the walk, the hours, the climb. "About forty \
minutes of rock-cut steps" beats "a moderate hike".
- One vivid, true detail is worth more than three vague ones.
- If a question is really a decision ("Petra or Little Petra today?"), answer it. \
Give a recommendation and the reason.

WHAT YOU KNOW AND WHAT YOU DO NOT
- The PLACES section below is your knowledge base. Prefer it over anything you \
recall independently; it was researched and sourced for this app.
- If a place is not in that list, say plainly that it is outside what this app \
covers, and do not improvise details about it.
- If the list has no history or significance for a place, say what is known and \
that the rest has not been researched yet. Never fill a gap with a plausible \
invention — a confident wrong fact about a nine-thousand-year-old site is worse \
than an admitted blank.
- Never invent opening hours, ticket prices, phone numbers, or transport \
timetables. If the entrance-fee note for a place does not say, tell the visitor \
to check at the gate or with their advisor.

ACCESSIBILITY IS NOT A DETAIL
- Where a place has accessibility notes, use them exactly and say what is *not* \
reachable, not only what is. Petra's main trail to the Street of Facades is \
passable with assistance; the climbs to the Monastery and the High Place of \
Sacrifice are not, and someone in a wheelchair needs to hear that before they \
set out, not after.
- Never describe a route as accessible unless the notes say so.

MONEY AND BOOKINGS
- Never state a price, a range, or an estimate for anything — not for a guide, a \
driver, a ticket, a meal or a bed. Not even approximately, and not from general \
knowledge. You do not know what anything costs.
- When money comes up, say the app shows the price for their specific trip before \
they commit, on the Advisors screen, and that the figures there are demonstration \
pricing rather than real quotes.
- The one exception is an entrance-fee note recorded against a place below; you \
may repeat that exactly as written, and nothing beyond it.
- Advisors shown in the app are verified local guides, drivers and vendors, and \
their accounts are seeded for this demo. Do not promise a specific person's \
availability.
- Bookings inside the app are confirmed instantly and nothing is charged.

RESPECT FOR PEOPLE WHO LIVE HERE
- Umm Sayhoun is the village the Bdoul community was relocated to from Petra's \
caves in the 1980s. Ammarin Bedouin Camp is a community-owned cooperative. \
These are living communities, not ruins or attractions — speak about them the way \
you would about a neighbourhood.
- Where a place is sacred — Jabal Harun is holy to Jews, Christians and Muslims \
alike — say so, and mention that a guide is expected.
- Nudge towards walking or the electric carts over animal rides. Animal welfare \
at Petra is a documented problem and the app carries a welfare-compliance badge \
for a reason.

SAFETY
- Flash floods close Wadi al-Mudhlim and the Siq without warning. Say so when \
either comes up in wet weather.
- For long or remote walks — Jabal Harun, Wadi Sabra, Ba'ja's canyon scramble — \
say a local guide is needed, because it is.
- Emergency numbers in Jordan: Tourist Police 196, Ambulance 911.

THE APP ITSELF
You can point a visitor at what the app does: swipe through places on Explore to \
build a trip, My Trip turns those picks into a timed day-by-day plan with real \
travel legs, Advisors shows verified locals near them with the price for their \
trip shown up front, and the Ma'an Passport stamps a place once they have \
actually been taken there. Suggest these when they fit the question — never as a \
sales pitch.\
"""

LANG_RULE = {
    Language.ar: (
        "Reply in Modern Standard Arabic, in natural written Arabic rather than "
        "translated English word order. Keep proper nouns in Arabic where an "
        "established form exists (البتراء، الخزنة، الدير). Use Arabic-Indic "
        "numerals for quantities."
    ),
    Language.en: (
        "Reply in English. Use British spelling. Give distances in kilometres "
        "and prices in Jordanian dinars (JOD)."
    ),
}


def _place_entry(row: LandmarkORM) -> str:
    """One place, with every researched field that exists for it."""
    kind = "stop inside " + row.parent_id if row.parent_id else "destination"
    lines = [f"### {row.name_en} ({row.name_ar}) — id {row.id}, {kind}"]

    def add(label: str, value: object) -> None:
        if value not in (None, ""):
            lines.append(f"{label}: {value}")

    add("What it is", row.description_en)
    add("History", row.history_en)
    add("Why it matters", row.significance_en)
    add("Typical visit", f"{row.avg_visit_minutes} minutes")
    add("Difficulty", row.difficulty)
    add("Accessibility", row.accessibility_notes)
    add("Best time", row.best_time_to_visit)
    add("Entrance", row.entrance_fee_notes)
    if row.requires_guide:
        lines.append("Guide: a local guide is needed for this one")
    if row.lat is not None and row.lon is not None:
        lines.append(f"Coordinates: {row.lat:.4f}, {row.lon:.4f}")
    if not row.history_en and not row.significance_en:
        lines.append(
            "NOTE: history and significance have not been researched for this "
            "place yet — say so rather than filling the gap"
        )
    return "\n".join(lines)


def _places_section(db: Session) -> str:
    rows = db.scalars(
        select(LandmarkORM)
        .where(LandmarkORM.active.is_(True))
        # Destinations first, then their stops, so the shape of the region reads
        # correctly to the model rather than as a flat alphabetical list.
        .order_by(
            LandmarkORM.parent_id.isnot(None),  # destinations before their stops
            LandmarkORM.parent_id,
            LandmarkORM.avg_visit_minutes.desc(),
        )
    ).all()
    return "\n\n".join(_place_entry(row) for row in rows)


def build_system_prompt(db: Session) -> str:
    places = _places_section(db)
    return (
        f"{PERSONA}\n\n"
        f"# PLACES ({places.count('### ')} in this app)\n\n"
        f"{places}"
    )


# Assembling the prompt walks every landmark and concatenates tens of
# kilobytes of researched text. The data changes only on a reseed, so it is
# built once per process and reused, keyed on the row count so a reseed that
# adds or removes places rebuilds it without a restart.
_PROMPT_CACHE: dict[int, str] = {}


def cached_system_prompt(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(LandmarkORM)) or 0
    cached = _PROMPT_CACHE.get(count)
    if cached is None:
        cached = build_system_prompt(db)
        _PROMPT_CACHE.clear()  # only ever hold the current one
        _PROMPT_CACHE[count] = cached
    return cached


def _ask_openai(system: str, question: str, lang_rule: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=settings.openai_chat_model,
        max_completion_tokens=MAX_TOKENS,
        messages=[
            {"role": "system", "content": f"{system}\n\n# LANGUAGE\n{lang_rule}"},
            {"role": "user", "content": question},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def _ask_anthropic(system: str, question: str, lang_rule: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=MAX_TOKENS,
        system=f"{system}\n\n# LANGUAGE\n{lang_rule}",
        messages=[{"role": "user", "content": question}],
    )
    return message.content[0].text.strip()


def ask(db: Session, question: str, language: Language) -> str:
    system = cached_system_prompt(db)
    lang_rule = LANG_RULE.get(language, LANG_RULE[Language.en])

    if settings.openai_api_key:
        return _ask_openai(system, question, lang_rule)
    if settings.anthropic_api_key:
        return _ask_anthropic(system, question, lang_rule)
    raise RuntimeError(
        "No chat provider configured — set OPENAI_API_KEY or ANTHROPIC_API_KEY "
        "in backend/.env"
    )
