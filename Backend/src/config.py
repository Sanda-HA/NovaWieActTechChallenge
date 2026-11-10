from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60
    # All AI goes through llm_service; the backend never calls a model directly.
    agent_url: str = "http://127.0.0.1:8000"


settings = Settings()
