"""Benchmark and KPI evaluation schemas."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class BenchmarkMetricOut(BaseModel):
    id: str
    approach: str
    fill_rate: float
    backorder_volume: float
    total_landed_cost: float
    recovery_time_days: float
    days_of_inventory: float
    constraint_violation_rate: float
    runtime_latency_ms: float
    solver_latency_ms: float
    recommendation_stability_pct: float
    details: Optional[str] = None

    class Config:
        from_attributes = True


class BenchmarkRunOut(BaseModel):
    id: str
    scenario_id: str
    run_timestamp: datetime
    notes: Optional[str] = None
    metrics: List[BenchmarkMetricOut] = []

    class Config:
        from_attributes = True


class BenchmarkComparisonTable(BaseModel):
    metric_name: str
    reorder_point: Any
    optimization_only: Any
    agent_assisted: Any
    unit: str
    agent_vs_opt_delta: str
    notes: str
