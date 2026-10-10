"""Plan generation, inspection, modification, and approval router."""
import uuid
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scenario import ScenarioSnapshot, DisruptionEvent
from app.models.plan import Plan, PlanAction, ApprovalRecord, PlanStatus, ActionType
from app.models.audit import AuditEvent
from app.schemas.plan import PlanOut, PlanApprovalRequest, PlanModificationRequest
from app.agents.coordinator import CentralCoordinator
from app.api.deps import require_planner, get_correlation_id
from app.models.user import User

router = APIRouter(prefix="", tags=["Plans"])


@router.post("/scenarios/{scenario_id}/generate-plan", response_model=PlanOut)
def generate_recovery_plan(
    scenario_id: str,
    current_user: User = Depends(require_planner),
    correlation_id: str = Depends(get_correlation_id),
    db: Session = Depends(get_db)
):
    """
    Executes coordinator to synthesize agent recommendations, resolve conflicts,
    execute OR-Tools optimizer, independently validate constraints, and store a versioned recovery plan.
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

    coordinator = CentralCoordinator()
    wf_res = coordinator.run_workflow(
        scenario_id=scenario_id,
        snapshot_version=snapshot.version,
        snapshot_hash=snapshot.snapshot_hash,
        network_data=network_data,
        disruptions=disruptions
    )

    # Determine status: AWAITING_APPROVAL if VALIDATED
    plan_status = PlanStatus.AWAITING_APPROVAL if wf_res["status"] == PlanStatus.VALIDATED else wf_res["status"]

    plan = Plan(
        id=wf_res["plan_id"],
        scenario_id=scenario_id,
        snapshot_id=snapshot.id,
        version=wf_res["plan_version"],
        plan_hash=wf_res["plan_hash"],
        status=plan_status,
        approach=wf_res["approach"],
        solver_status=wf_res["solver_status"],
        total_cost=wf_res["total_cost"],
        expected_fill_rate=wf_res["expected_fill_rate"],
        expected_backorders=wf_res["expected_backorders"],
        solver_duration_ms=wf_res["solver_duration_ms"],
        workflow_duration_ms=wf_res["workflow_duration_ms"],
        trade_off_summary=wf_res["trade_off_summary"],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(plan)

    # Add plan actions
    for act in wf_res["actions"]:
        action_obj = PlanAction(
            id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
            plan_id=plan.id,
            action_type=act["action_type"] if isinstance(act["action_type"], ActionType) else ActionType(act["action_type"]),
            origin_node_id=act.get("origin_node_id"),
            destination_node_id=act["destination_node_id"],
            product_id=act["product_id"],
            quantity=act["quantity"],
            start_day=act["start_day"],
            delivery_day=act["delivery_day"],
            estimated_cost=act.get("estimated_cost", 0.0),
            rationale=act.get("rationale"),
            evidence_ref=act.get("evidence_ref")
        )
        db.add(action_obj)

    # Audit event
    audit_ev = AuditEvent(
        id=f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
        correlation_id=correlation_id,
        user_id=current_user.id,
        action="PLAN_GENERATED",
        resource_type="Plan",
        resource_id=plan.id,
        details=json.dumps({
            "plan_hash": plan.plan_hash,
            "total_cost": plan.total_cost,
            "actions_count": len(wf_res["actions"])
        }),
        timestamp=datetime.utcnow()
    )
    db.add(audit_ev)
    db.commit()
    db.refresh(plan)

    return plan


@router.get("/plans/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: str, db: Session = Depends(get_db)):
    """Retrieves plan details, actions, and approval status."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.get("/scenarios/{scenario_id}/plans", response_model=List[PlanOut])
def list_scenario_plans(scenario_id: str, db: Session = Depends(get_db)):
    """Lists all generated plans for a scenario."""
    return db.query(Plan).filter(Plan.scenario_id == scenario_id).order_by(Plan.created_at.desc()).all()


@router.post("/plans/{plan_id}/approve", response_model=PlanOut)
def approve_or_reject_plan(
    plan_id: str,
    req: PlanApprovalRequest,
    current_user: User = Depends(require_planner),
    correlation_id: str = Depends(get_correlation_id),
    db: Session = Depends(get_db)
):
    """
    Formally records planner approval or rejection decision.
    Validates exact plan hash to prevent modifying plan content without re-approval.
    """
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.plan_hash != req.plan_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hash mismatch: Plan has been modified or presented hash is invalid. Approval rejected."
        )

    if plan.status not in [PlanStatus.AWAITING_APPROVAL, PlanStatus.VALIDATED, PlanStatus.DRAFT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve plan currently in '{plan.status}' state."
        )

    decision = req.decision.upper()
    if decision == "APPROVED":
        plan.status = PlanStatus.APPROVED
    elif decision == "REJECTED":
        plan.status = PlanStatus.REJECTED
        plan.rejection_reason = req.comments
    else:
        raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'")

    plan.updated_at = datetime.utcnow()

    approval_rec = ApprovalRecord(
        id=f"APP-{uuid.uuid4().hex[:8].upper()}",
        plan_id=plan.id,
        plan_version=plan.version,
        plan_hash=plan.plan_hash,
        user_id=current_user.id,
        decision=decision,
        comments=req.comments,
        created_at=datetime.utcnow()
    )
    db.add(approval_rec)

    audit_ev = AuditEvent(
        id=f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
        correlation_id=correlation_id,
        user_id=current_user.id,
        action=f"PLAN_{decision}",
        resource_type="Plan",
        resource_id=plan.id,
        details=json.dumps({"plan_hash": plan.plan_hash, "decision": decision, "comments": req.comments}),
        timestamp=datetime.utcnow()
    )
    db.add(audit_ev)
    db.commit()
    db.refresh(plan)

    return plan
