"""Audit trail inspection API router."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditEvent
from app.schemas.audit import AuditEventOut
from app.api.deps import require_planner

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=List[AuditEventOut])
def list_audit_events(
    correlation_id: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user = Depends(require_planner),
    db: Session = Depends(get_db)
):
    """Retrieves immutable audit trail logs, optionally filtered by correlation ID or resource."""
    query = db.query(AuditEvent)
    if correlation_id:
        query = query.filter(AuditEvent.correlation_id == correlation_id)
    if resource_type:
        query = query.filter(AuditEvent.resource_type == resource_type)

    return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()
