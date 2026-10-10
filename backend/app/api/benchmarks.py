"""Benchmarking and evaluation router."""
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scenario import ScenarioSnapshot, DisruptionEvent
from app.models.benchmark import BenchmarkRun
from app.schemas.benchmark import BenchmarkRunOut
from app.evaluation.benchmark_runner import run_comprehensive_benchmark
from app.api.deps import require_planner

router = APIRouter(prefix="", tags=["Benchmarks"])


@router.post("/scenarios/{scenario_id}/benchmark")
def execute_benchmark(
    scenario_id: str,
    current_user = Depends(require_planner),
    db: Session = Depends(get_db)
):
    """
    Executes a comprehensive, controlled benchmark across all three methods:
    1. Baseline 1: Traditional Reorder-Point policy
    2. Baseline 2: Pure OR-Tools Mathematical Optimization
    3. Approach 3: Agent-Assisted Optimization
    Measures and persists all 8 required industrial KPIs.
    """
    snapshot = (
        db.query(ScenarioSnapshot)
        .filter(ScenarioSnapshot.scenario_id == scenario_id)
        .order_by(ScenarioSnapshot.version.desc())
        .first()
    )
    if not snapshot:
        raise HTTPException(status_code=404, detail="Scenario snapshot not found")

    disruptions_db = db.query(DisruptionEvent).filter(DisruptionEvent.scenario_id == scenario_id).all()
    disruptions = [
        {
            "id": d.id,
            "target_node_id": d.target_node_id,
            "start_day": d.start_day,
            "end_day": d.end_day,
            "severity": d.severity,
            "prevents_new_shipments": d.prevents_new_shipments,
            "prevents_in_transit_receipts": d.prevents_in_transit_receipts
        }
        for d in disruptions_db
    ]
    network_data = json.loads(snapshot.data_payload)

    benchmark_data = run_comprehensive_benchmark(
        scenario_id=scenario_id,
        network_data=network_data,
        disruptions=disruptions,
        snapshot_hash=snapshot.snapshot_hash,
        db=db,
        horizon_days=14
    )

    return benchmark_data


@router.get("/scenarios/{scenario_id}/benchmarks", response_model=List[BenchmarkRunOut])
def list_scenario_benchmarks(scenario_id: str, db: Session = Depends(get_db)):
    """Lists historical benchmark runs and KPI evaluations for a scenario."""
    return db.query(BenchmarkRun).filter(BenchmarkRun.scenario_id == scenario_id).order_by(BenchmarkRun.run_timestamp.desc()).all()
