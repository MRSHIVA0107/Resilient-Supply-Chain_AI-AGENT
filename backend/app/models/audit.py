"""Audit logging database models."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(50), primary_key=True, index=True)
    correlation_id = Column(String(64), index=True, nullable=False)
    user_id = Column(String(36), index=True, nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(50), nullable=False, index=True)
    details = Column(Text, nullable=True)  # JSON serialized metadata or diff
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
