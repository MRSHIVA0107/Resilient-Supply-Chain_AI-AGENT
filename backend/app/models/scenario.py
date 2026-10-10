"""Scenario and disruption event database models."""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class DisruptionType(str, enum.Enum):
    SUPPLIER_SHUTDOWN = "SUPPLIER_SHUTDOWN"
    LANE_BLOCKED = "LANE_BLOCKED"
    CAPACITY_REDUCTION = "CAPACITY_REDUCTION"


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    seed = Column(Integer, default=42, nullable=False)
    horizon_days = Column(Integer, default=14, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    disruptions = relationship("DisruptionEvent", back_populates="scenario", cascade="all, delete-orphan")
    snapshots = relationship("ScenarioSnapshot", back_populates="scenario", cascade="all, delete-orphan")


class DisruptionEvent(Base):
    __tablename__ = "disruption_events"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    target_node_id = Column(String(50), ForeignKey("nodes.id"), nullable=False)
    disruption_type = Column(Enum(DisruptionType), default=DisruptionType.SUPPLIER_SHUTDOWN, nullable=False)
    start_day = Column(Integer, nullable=False)
    end_day = Column(Integer, nullable=False)
    severity = Column(Float, default=1.0, nullable=False)  # 1.0 = 100% outage
    prevents_new_shipments = Column(Boolean, default=True, nullable=False)
    prevents_in_transit_receipts = Column(Boolean, default=False, nullable=False)

    scenario = relationship("Scenario", back_populates="disruptions")


class ScenarioSnapshot(Base):
    __tablename__ = "scenario_snapshots"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    snapshot_hash = Column(String(64), nullable=False)  # SHA-256
    data_payload = Column(Text, nullable=False)  # Immutable serialized JSON
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    scenario = relationship("Scenario", back_populates="snapshots")
