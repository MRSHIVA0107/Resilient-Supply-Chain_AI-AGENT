"""Structured Agent input and output schemas."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.plan import ActionType


class AgentObservation(BaseModel):
    category: str  # DEMAND_SURGE, SHORTAGE_RISK, SUPPLIER_DOWN, LANE_CONGESTION, etc.
    entity_id: str
    product_id: Optional[str] = None
    day: Optional[int] = None
    description: str
    severity: str = "HIGH"  # LOW, MEDIUM, HIGH, CRITICAL
    evidence_ref: str


class CandidateActionProposal(BaseModel):
    proposal_id: str
    agent_name: str
    action_type: ActionType
    origin_node_id: Optional[str] = None
    destination_node_id: str
    product_id: str
    quantity: float = Field(gt=0.0)
    start_day: int = Field(ge=1)
    delivery_day: int = Field(ge=1)
    estimated_unit_cost: float = Field(ge=0.0)
    total_estimated_cost: float = Field(ge=0.0)
    rationale: str
    evidence_ref: str
    priority_score: float = Field(default=1.0)


class AgentRunResult(BaseModel):
    agent_name: str
    status: str  # SUCCESS, WARNING, BLOCKED, FAILED
    prompt_version: str = "v1.0"
    model_provider: str = "deterministic"
    model_identifier: str = "rules-engine"
    execution_time_ms: float
    observations: List[AgentObservation] = []
    proposals: List[CandidateActionProposal] = []
    assumptions: List[str] = []
    warnings: List[str] = []
    evidence_refs: List[str] = []
    metrics: Dict[str, Any] = {}


class ConflictDetectionReport(BaseModel):
    has_conflicts: bool = False
    conflicting_proposals_count: int = 0
    conflict_details: List[str] = []
    deduplicated_proposals_count: int = 0
    rejected_proposals_count: int = 0


class CoordinatorRunResponse(BaseModel):
    scenario_id: str
    snapshot_version: int
    snapshot_hash: str
    agent_results: Dict[str, AgentRunResult]
    conflict_report: ConflictDetectionReport
    candidate_decisions_count: int
    solver_status: str
    plan_id: str
    plan_version: int
    plan_hash: str
    total_cost: float
    expected_fill_rate: float
    trade_off_explanation: str
    workflow_duration_ms: float
