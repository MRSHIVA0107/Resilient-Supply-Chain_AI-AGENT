"""Scenario and disruption schemas."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.scenario import DisruptionType


class DisruptionEventBase(BaseModel):
    target_node_id: str
    disruption_type: DisruptionType = DisruptionType.SUPPLIER_SHUTDOWN
    start_day: int = Field(default=1, ge=1)
    end_day: int = Field(default=7, ge=1)
    severity: float = Field(default=1.0, ge=0.0, le=1.0)
    prevents_new_shipments: bool = True
    prevents_in_transit_receipts: bool = False


class DisruptionEventSchema(DisruptionEventBase):
    id: str
    scenario_id: str

    class Config:
        from_attributes = True


class ScenarioBase(BaseModel):
    name: str
    description: Optional[str] = None
    seed: int = 42
    horizon_days: int = Field(default=14, ge=7, le=30)


class ScenarioCreate(ScenarioBase):
    disruptions: List[DisruptionEventBase] = []


class ScenarioOut(ScenarioBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    disruptions: List[DisruptionEventSchema] = []

    class Config:
        from_attributes = True


class ScenarioSnapshotOut(BaseModel):
    id: str
    scenario_id: str
    version: int
    snapshot_hash: str
    created_at: datetime

    class Config:
        from_attributes = True
