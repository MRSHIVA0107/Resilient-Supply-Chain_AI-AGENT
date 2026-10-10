"""Simulated execution API router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.execution import ExecutionRun
from app.models.plan import Plan
from app.schemas.execution import ExecutionRunOut, ExecutePlanRequest
from app.simulation.executor import PlanExecutionService
from app.api.deps import require_planner, get_correlation_id
from app.models.user import User

router = APIRouter(prefix="", tags=["Execution"])


@router.post("/plans/{plan_id}/execute")
def execute_plan(
    plan_id: str,
    req: ExecutePlanRequest,
    current_user: User = Depends(require_planner),
    correlation_id: str = Depends(get_correlation_id),
    db: Session = Depends(get_db)
):
    """
    Dispatches approved plan actions to the simulated execution service.
    Enforces authorization, plan approval status, plan hash integrity, and idempotency.
    """
    executor = PlanExecutionService(db=db)
    success, msg, details = executor.execute_plan(
        plan_id=plan_id,
        plan_hash=req.plan_hash,
        user_id=current_user.id,
        idempotency_key=req.idempotency_key,
        correlation_id=correlation_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    return {
        "success": True,
        "message": msg,
        "details": details
    }


@router.get("/execution/runs/{run_id}", response_model=ExecutionRunOut)
def get_execution_run(run_id: str, db: Session = Depends(get_db)):
    """Retrieves an execution run record and its individual action dispatch logs."""
    run = db.query(ExecutionRun).filter(ExecutionRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    return run


@router.get("/scenarios/{scenario_id}/executions", response_model=List[ExecutionRunOut])
def list_scenario_executions(scenario_id: str, db: Session = Depends(get_db)):
    """Lists all execution runs associated with plans of a scenario."""
    plans = db.query(Plan).filter(Plan.scenario_id == scenario_id).all()
    plan_ids = [p.id for p in plans]
    runs = db.query(ExecutionRun).filter(ExecutionRun.plan_id.in_(plan_ids)).order_by(ExecutionRun.started_at.desc()).all()
    return runs
