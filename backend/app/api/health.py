"""Health and readiness diagnostic API router."""
import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="", tags=["Health"])

START_TIME = time.time()


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health and readiness diagnostics endpoint."""
    db_status = "UNKNOWN"
    try:
        db.execute(text("SELECT 1"))
        db_status = "HEALTHY"
    except Exception as e:
        db_status = f"UNHEALTHY: {str(e)}"

    uptime_seconds = round(time.time() - START_TIME, 1)

    return {
        "status": "HEALTHY" if db_status == "HEALTHY" else "DEGRADED",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.utcnow().isoformat()
    }
