"""Recovery Plan and Approval database models."""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class PlanStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    VALIDATED = "VALIDATED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    APPROVED = "APPROVED"
    EXECUTING = "EXECUTING"
    EXECUTED = "EXECUTED"
    REJECTED = "REJECTED"
    INVALIDATED = "INVALIDATED"
    FAILED = "FAILED"
    INFEASIBLE = "INFEASIBLE"


class PlanningApproach(str, enum.Enum):
    REORDER_POINT = "REORDER_POINT"
    OPTIMIZATION_ONLY = "OPTIMIZATION_ONLY"
    AGENT_ASSISTED = "AGENT_ASSISTED"


class ActionType(str, enum.Enum):
    PROCUREMENT = "PROCUREMENT"
    EXPEDITED_PROCUREMENT = "EXPEDITED_PROCUREMENT"
    PRODUCTION = "PRODUCTION"
    SHIPMENT = "SHIPMENT"
    EXPEDITED_SHIPMENT = "EXPEDITED_SHIPMENT"


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    snapshot_id = Column(String(50), ForeignKey("scenario_snapshots.id"), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    plan_hash = Column(String(64), nullable=False)  # SHA-256 of actions + snapshot_hash
    status = Column(Enum(PlanStatus), default=PlanStatus.DRAFT, nullable=False, index=True)
    approach = Column(Enum(PlanningApproach), default=PlanningApproach.AGENT_ASSISTED, nullable=False, index=True)
    solver_status = Column(String(50), nullable=True)  # OPTIMAL, FEASIBLE, INFEASIBLE, etc.
    total_cost = Column(Float, default=0.0, nullable=False)
    expected_fill_rate = Column(Float, default=0.0, nullable=False)
    expected_backorders = Column(Float, default=0.0, nullable=False)
    solver_duration_ms = Column(Float, default=0.0, nullable=False)
    workflow_duration_ms = Column(Float, default=0.0, nullable=False)
    trade_off_summary = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    actions = relationship("PlanAction", back_populates="plan", cascade="all, delete-orphan")
    approvals = relationship("ApprovalRecord", back_populates="plan", cascade="all, delete-orphan")


class PlanAction(Base):
    __tablename__ = "plan_actions"

    id = Column(String(50), primary_key=True, index=True)
    plan_id = Column(String(50), ForeignKey("plans.id"), nullable=False, index=True)
    action_type = Column(Enum(ActionType), nullable=False)
    origin_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=True)
    destination_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    start_day = Column(Integer, nullable=False)
    delivery_day = Column(Integer, nullable=False)
    estimated_cost = Column(Float, default=0.0, nullable=False)
    rationale = Column(Text, nullable=True)
    evidence_ref = Column(String(255), nullable=True)

    plan = relationship("Plan", back_populates="actions")


class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id = Column(String(50), primary_key=True, index=True)
    plan_id = Column(String(50), ForeignKey("plans.id"), nullable=False, index=True)
    plan_version = Column(Integer, nullable=False)
    plan_hash = Column(String(64), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    decision = Column(String(20), nullable=False)  # APPROVED or REJECTED
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    plan = relationship("Plan", back_populates="approvals")
