"""Audit event schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class AuditEventOut(BaseModel):
    id: str
    correlation_id: str
    user_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
