"""Scenarios and network data router."""
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scenario import Scenario, DisruptionEvent, ScenarioSnapshot, DisruptionType
from app.models.audit import AuditEvent
from app.schemas.scenario import ScenarioOut, ScenarioCreate
from app.data.generator import generate_demonstration_network
from app.data.validator import validate_network_data
from app.api.deps import require_planner, get_correlation_id
from app.models.user import User

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.get("", response_model=List[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db)):
    """Lists all configured scenarios."""
    scenarios = db.query(Scenario).all()
    # If empty, automatically generate baseline demo scenario
    if not scenarios:
        demo = generate_demonstration_network()
        scen = Scenario(
            id=demo["scenario_id"],
            name=demo["name"],
            description=demo["description"],
            seed=demo["seed"],
            horizon_days=demo["horizon_days"],
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(scen)
        for dis in demo["disruptions"]:
            dis_ev = DisruptionEvent(
                id=dis["id"],
                scenario_id=scen.id,
                target_node_id=dis["target_node_id"],
                disruption_type=DisruptionType.SUPPLIER_SHUTDOWN,
                start_day=dis["start_day"],
                end_day=dis["end_day"],
                severity=dis["severity"],
                prevents_new_shipments=dis["prevents_new_shipments"],
                prevents_in_transit_receipts=dis["prevents_in_transit_receipts"]
            )
            db.add(dis_ev)

        # Store baseline snapshot
        snap = ScenarioSnapshot(
            id=f"SNAP-{scen.id}-V1",
            scenario_id=scen.id,
            version=1,
            snapshot_hash=demo["snapshot_hash"],
            data_payload=json.dumps(demo["network_data"], sort_keys=True),
            created_at=datetime.utcnow()
        )
        db.add(snap)
        db.commit()
        scenarios = [scen]

    return scenarios


@router.post("", response_model=ScenarioOut)
def create_scenario(
    scen_in: ScenarioCreate,
    current_user: User = Depends(require_planner),
    correlation_id: str = Depends(get_correlation_id),
    db: Session = Depends(get_db)
):
    """Creates a new scenario and compiles an immutable snapshot."""
    scen_id = f"SCEN-{uuid.uuid4().hex[:8].upper()}"
    demo = generate_demonstration_network(
        scenario_id=scen_id,
        seed=scen_in.seed,
        horizon_days=scen_in.horizon_days
    )

    scen = Scenario(
        id=scen_id,
        name=scen_in.name,
        description=scen_in.description,
        seed=scen_in.seed,
        horizon_days=scen_in.horizon_days,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(scen)

    for dis in scen_in.disruptions:
        dis_ev = DisruptionEvent(
            id=f"DISRUPT-{uuid.uuid4().hex[:8].upper()}",
            scenario_id=scen.id,
            target_node_id=dis.target_node_id,
            disruption_type=dis.disruption_type,
            start_day=dis.start_day,
            end_day=dis.end_day,
            severity=dis.severity,
            prevents_new_shipments=dis.prevents_new_shipments,
            prevents_in_transit_receipts=dis.prevents_in_transit_receipts
        )
        db.add(dis_ev)

    snap = ScenarioSnapshot(
        id=f"SNAP-{scen.id}-V1",
        scenario_id=scen.id,
        version=1,
        snapshot_hash=demo["snapshot_hash"],
        data_payload=json.dumps(demo["network_data"], sort_keys=True),
        created_at=datetime.utcnow()
    )
    db.add(snap)

    audit_ev = AuditEvent(
        id=f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
        correlation_id=correlation_id,
        user_id=current_user.id,
        action="SCENARIO_CREATED",
        resource_type="Scenario",
        resource_id=scen.id,
        details=json.dumps({"name": scen.name, "seed": scen.seed}),
        timestamp=datetime.utcnow()
    )
    db.add(audit_ev)
    db.commit()
    db.refresh(scen)
    return scen


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    """Retrieves scenario details and disruption parameters."""
    scen = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scen:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scen


@router.get("/{scenario_id}/network-data")
def get_scenario_network_data(scenario_id: str, db: Session = Depends(get_db)):
    """Retrieves the full network payload from the scenario snapshot."""
    snapshot = (
        db.query(ScenarioSnapshot)
        .filter(ScenarioSnapshot.scenario_id == scenario_id)
        .order_by(ScenarioSnapshot.version.desc())
        .first()
    )
    if not snapshot:
        raise HTTPException(status_code=404, detail="Scenario snapshot not found")

    return {
        "scenario_id": scenario_id,
        "snapshot_version": snapshot.version,
        "snapshot_hash": snapshot.snapshot_hash,
        "network_data": json.loads(snapshot.data_payload)
    }


@router.post("/validate")
def validate_dataset(payload: Dict[str, Any]):
    """Validates raw network dataset against schema and business integrity constraints."""
    is_valid, errors = validate_network_data(payload)
    return {
        "is_valid": is_valid,
        "error_count": len(errors),
        "errors": errors
    }


@router.post("/{scenario_id}/reset")
def reset_scenario(
    scenario_id: str,
    current_user: User = Depends(require_planner),
    correlation_id: str = Depends(get_correlation_id),
    db: Session = Depends(get_db)
):
    """Resets the scenario to default baseline configuration."""
    scen = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scen:
        raise HTTPException(status_code=404, detail="Scenario not found")

    demo = generate_demonstration_network(scenario_id=scen.id, seed=scen.seed, horizon_days=scen.horizon_days)
    
    # Create incremented version snapshot
    latest_snap = (
        db.query(ScenarioSnapshot)
        .filter(ScenarioSnapshot.scenario_id == scen.id)
        .order_by(ScenarioSnapshot.version.desc())
        .first()
    )
    new_version = (latest_snap.version + 1) if latest_snap else 1

    snap = ScenarioSnapshot(
        id=f"SNAP-{scen.id}-V{new_version}",
        scenario_id=scen.id,
        version=new_version,
        snapshot_hash=demo["snapshot_hash"],
        data_payload=json.dumps(demo["network_data"], sort_keys=True),
        created_at=datetime.utcnow()
    )
    db.add(snap)

    audit_ev = AuditEvent(
        id=f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
        correlation_id=correlation_id,
        user_id=current_user.id,
        action="SCENARIO_RESET",
        resource_type="Scenario",
        resource_id=scen.id,
        details=json.dumps({"new_version": new_version}),
        timestamp=datetime.utcnow()
    )
    db.add(audit_ev)
    db.commit()

    return {"message": f"Scenario '{scenario_id}' reset to baseline snapshot v{new_version}", "version": new_version}
