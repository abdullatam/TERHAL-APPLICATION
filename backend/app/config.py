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

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
