from fastapi import APIRouter
from pydantic import BaseModel

from app.models import Language
from app.services.chat_service import ask

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    language: Language = Language.en


class ChatResponse(BaseModel):
    answer: str


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    return ChatResponse(answer=ask(payload.question, payload.language))
