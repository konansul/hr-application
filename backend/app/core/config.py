from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    OPENROUTER_API_KEY: str
    GEMINI_MODEL: str

    DATABASE_URL: str
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()