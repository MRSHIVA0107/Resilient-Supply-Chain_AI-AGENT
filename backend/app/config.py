"""Application configuration and environment settings."""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Resilient Supply Chain Agentic Platform"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Database
    # Default to sqlite for seamless local development if Postgres is not configured
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./supply_chain.db"
    )
    
    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev_insecure_jwt_secret_key_change_in_production_9f8e7d6c5b4a")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = [
        orig.strip()
        for orig in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
        ).split(",")
        if orig.strip()
    ]
    
    # Optional LLM Integration (fallback to deterministic mode if unset)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "deterministic")  # deterministic | openai | mock
    LLM_MODEL: str = os.getenv("LLM_MODEL", "deterministic-rules-v1")
    
    # Solver defaults
    SOLVER_TIMEOUT_SECONDS: int = 30
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
