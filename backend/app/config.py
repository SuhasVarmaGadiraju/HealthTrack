"""Application configuration loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime settings for the HealthTrack FastAPI service."""

    app_name: str = "HealthTrack API"
    database_url: str = "sqlite:///./healthtrack.db"
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def resolved_database_url(self) -> str:
        """Resolve relative SQLite paths against the backend directory."""
        prefix = "sqlite:///./"
        if self.database_url.startswith(prefix):
            relative_path = self.database_url[len(prefix) :]
            db_path = (BACKEND_DIR / relative_path).resolve()
            return f"sqlite:///{db_path.as_posix()}"
        return self.database_url

    @property
    def cors_origin_list(self) -> list[str]:
        """Return parsed list of allowed CORS origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
