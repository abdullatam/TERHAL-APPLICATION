from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute, not relative: scripts/ run from the repo root, and a bare ".env"
# would resolve against the caller's working directory and silently hand back
# an empty DATABASE_URL.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    anthropic_api_key: str = ""
    # Chat uses OpenAI when this is set and falls back to Anthropic otherwise,
    # so a teammate with only the Anthropic key still gets a working assistant.
    openai_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    # Vision needs a model that accepts images; 4o-mini does and is cheap
    # enough to point a camera at things repeatedly during a demo.
    openai_vision_model: str = "gpt-4o-mini"
    allowed_origins: str = "http://localhost:5173"
    database_url: str = ""

    # DEMO ONLY. Every booking is issued this same PIN so the meeting-point
    # handshake can be shown on stage without coordinating two phones. Before
    # this is in front of a real tourist it must become a per-booking random
    # code — the column already stores one per booking, so the change is here
    # and in create_booking, nowhere else.
    demo_trip_pin: str = "1234"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
