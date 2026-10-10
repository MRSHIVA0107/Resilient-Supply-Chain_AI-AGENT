"""Pydantic schemas registry."""
from app.schemas.auth import UserBase, UserCreate, UserLogin, UserOut, Token, TokenData
from app.schemas.supply_chain import (
    NodeSchema, ProductSchema, BillOfMaterialsSchema, TransportLaneSchema,
    SupplierCapabilitySchema, InventoryRecordSchema, ConfirmedInboundShipmentSchema,
    DemandRecordSchema, FullNetworkData
)
from app.schemas.scenario import (
    DisruptionEventBase, DisruptionEventSchema, ScenarioBase, ScenarioCreate,
    ScenarioOut, ScenarioSnapshotOut
)
from app.schemas.agent import (
    AgentObservation, CandidateActionProposal, AgentRunResult,
    ConflictDetectionReport, CoordinatorRunResponse
)
from app.schemas.plan import (
    PlanActionBase, PlanActionSchema, ApprovalRecordSchema, PlanOut,
    PlanApprovalRequest, PlanModificationRequest
)
from app.schemas.execution import (
    ExecutionActionLogSchema, ExecutionRunOut, ExecutePlanRequest
)
from app.schemas.benchmark import (
    BenchmarkMetricOut, BenchmarkRunOut, BenchmarkComparisonTable
)
from app.schemas.audit import AuditEventOut

__all__ = [
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserOut",
    "Token",
    "TokenData",
    "NodeSchema",
    "ProductSchema",
    "BillOfMaterialsSchema",
    "TransportLaneSchema",
    "SupplierCapabilitySchema",
    "InventoryRecordSchema",
    "ConfirmedInboundShipmentSchema",
    "DemandRecordSchema",
    "FullNetworkData",
    "DisruptionEventBase",
    "DisruptionEventSchema",
    "ScenarioBase",
    "ScenarioCreate",
    "ScenarioOut",
    "ScenarioSnapshotOut",
    "AgentObservation",
    "CandidateActionProposal",
    "AgentRunResult",
    "ConflictDetectionReport",
    "CoordinatorRunResponse",
    "PlanActionBase",
    "PlanActionSchema",
    "ApprovalRecordSchema",
    "PlanOut",
    "PlanApprovalRequest",
    "PlanModificationRequest",
    "ExecutionActionLogSchema",
    "ExecutionRunOut",
    "ExecutePlanRequest",
    "BenchmarkMetricOut",
    "BenchmarkRunOut",
    "BenchmarkComparisonTable",
    "AuditEventOut",
]
