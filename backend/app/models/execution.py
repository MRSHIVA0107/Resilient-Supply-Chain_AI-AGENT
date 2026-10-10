"""Execution run and action log database models."""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ExecutionStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"


class ExecutionActionStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class ExecutionRun(Base):
    __tablename__ = "execution_runs"

    id = Column(String(50), primary_key=True, index=True)
    plan_id = Column(String(50), ForeignKey("plans.id"), nullable=False, index=True)
    plan_hash = Column(String(64), nullable=False)
    executed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.IN_PROGRESS, nullable=False, index=True)
    total_actions = Column(Integer, default=0, nullable=False)
    successful_actions = Column(Integer, default=0, nullable=False)
    failed_actions = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    action_logs = relationship("ExecutionActionLog", back_populates="execution_run", cascade="all, delete-orphan")


class ExecutionActionLog(Base):
    __tablename__ = "execution_action_logs"

    id = Column(String(50), primary_key=True, index=True)
    execution_run_id = Column(String(50), ForeignKey("execution_runs.id"), nullable=False, index=True)
    plan_action_id = Column(String(50), nullable=False)
    status = Column(Enum(ExecutionActionStatus), nullable=False)
    action_type = Column(String(50), nullable=False)
    executed_quantity = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    execution_run = relationship("ExecutionRun", back_populates="action_logs")


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key = Column(String(100), primary_key=True, index=True)
    plan_id = Column(String(50), nullable=False)
    execution_run_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
