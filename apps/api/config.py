from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = ""
    groq_api_key: str = ""
    telegram_token: str = ""
    api_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
