"""Recovery plan and approval Pydantic schemas."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.plan import PlanStatus, PlanningApproach, ActionType


class PlanActionBase(BaseModel):
    action_type: ActionType
    origin_node_id: Optional[str] = None
    destination_node_id: str
    product_id: str
    quantity: float = Field(gt=0.0)
    start_day: int = Field(ge=1)
    delivery_day: int = Field(ge=1)
    estimated_cost: float = Field(ge=0.0)
    rationale: Optional[str] = None
    evidence_ref: Optional[str] = None


class PlanActionSchema(PlanActionBase):
    id: str
    plan_id: str

    class Config:
        from_attributes = True


class ApprovalRecordSchema(BaseModel):
    id: str
    plan_id: str
    plan_version: int
    plan_hash: str
    user_id: str
    decision: str
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PlanOut(BaseModel):
    id: str
    scenario_id: str
    snapshot_id: str
    version: int
    plan_hash: str
    status: PlanStatus
    approach: PlanningApproach
    solver_status: Optional[str] = None
    total_cost: float
    expected_fill_rate: float
    expected_backorders: float
    solver_duration_ms: float
    workflow_duration_ms: float
    trade_off_summary: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    actions: List[PlanActionSchema] = []
    approvals: List[ApprovalRecordSchema] = []

    class Config:
        from_attributes = True


class PlanApprovalRequest(BaseModel):
    plan_hash: str
    decision: str = "APPROVED"  # APPROVED or REJECTED
    comments: Optional[str] = None


class PlanModificationRequest(BaseModel):
    actions_to_add: List[PlanActionBase] = []
    action_ids_to_remove: List[str] = []
    reason: str
