"""Benchmark run and evaluation KPI database models."""
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(String(50), primary_key=True, index=True)
    scenario_id = Column(String(50), ForeignKey("scenarios.id"), nullable=False, index=True)
    run_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)

    metrics = relationship("BenchmarkMetric", back_populates="benchmark_run", cascade="all, delete-orphan")


class BenchmarkMetric(Base):
    __tablename__ = "benchmark_metrics"

    id = Column(String(50), primary_key=True, index=True)
    benchmark_run_id = Column(String(50), ForeignKey("benchmark_runs.id"), nullable=False, index=True)
    approach = Column(String(50), nullable=False, index=True)  # REORDER_POINT, OPTIMIZATION_ONLY, AGENT_ASSISTED
    fill_rate = Column(Float, nullable=False)  # 0.0 to 1.0
    backorder_volume = Column(Float, nullable=False)  # total units backordered
    total_landed_cost = Column(Float, nullable=False)  # total modeled cost in USD
    recovery_time_days = Column(Float, nullable=False)  # days until service rate recovered >= 95%
    days_of_inventory = Column(Float, nullable=False)  # average DOI across nodes
    constraint_violation_rate = Column(Float, nullable=False)  # violations / total evaluated
    runtime_latency_ms = Column(Float, nullable=False)  # wall-clock duration
    solver_latency_ms = Column(Float, nullable=False, default=0.0)
    recommendation_stability_pct = Column(Float, nullable=False)  # similarity across perturbation runs (0-100%)
    details = Column(Text, nullable=True)  # breakdown JSON (violations by type, daily stock levels, etc.)

    benchmark_run = relationship("BenchmarkRun", back_populates="metrics")
