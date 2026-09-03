from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute, not relative: scripts/ run from the repo root, and a bare ".env"
# would resolve against the caller's working directory and silently hand back
# an empty DATABASE_URL.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    anthropic_api_key: str = ""
    allowed_origins: str = "http://localhost:5173"
    database_url: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
