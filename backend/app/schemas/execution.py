"""Simulated execution schemas."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.execution import ExecutionStatus, ExecutionActionStatus


class ExecutionActionLogSchema(BaseModel):
    id: str
    plan_action_id: str
    status: ExecutionActionStatus
    action_type: str
    executed_quantity: float
    message: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True


class ExecutionRunOut(BaseModel):
    id: str
    plan_id: str
    plan_hash: str
    executed_by_user_id: str
    status: ExecutionStatus
    total_actions: int
    successful_actions: int
    failed_actions: int
    error_summary: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    action_logs: List[ExecutionActionLogSchema] = []

    class Config:
        from_attributes = True


class ExecutePlanRequest(BaseModel):
    plan_hash: str
    idempotency_key: str
