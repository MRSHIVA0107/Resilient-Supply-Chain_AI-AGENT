"""Safe Plan Execution Service.
Enforces approval lifecycle transitions, hash verification, idempotency,
and simulated action dispatching with detailed audit logging.
"""
import uuid
from datetime import datetime
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.plan import Plan, PlanStatus
from app.models.execution import (
    ExecutionRun, ExecutionActionLog, IdempotencyKey, ExecutionStatus, ExecutionActionStatus
)
from app.models.scenario import ScenarioSnapshot
from app.models.audit import AuditEvent
from app.simulation.engine import SupplyChainSimulationEngine
import json


class PlanExecutionService:
    """Safe execution service enforcing strict approval rules before dispatch."""

    def __init__(self, db: Session):
        self.db = db

    def execute_plan(
        self,
        plan_id: str,
        plan_hash: str,
        user_id: str,
        idempotency_key: str,
        correlation_id: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Executes an approved plan safely:
        1. Check idempotency key: reject duplicate executions.
        2. Verify plan status: MUST be PlanStatus.APPROVED.
        3. Verify exact plan hash: protect against tampering or stale edits.
        4. Check snapshot freshness: ensure input state hasn't been superseded.
        5. Run simulated execution.
        6. Record execution run, action logs, audit event.
        7. Transition plan status to EXECUTED.
        """
        # 1. Idempotency check
        existing_key = self.db.query(IdempotencyKey).filter(IdempotencyKey.key == idempotency_key).first()
        if existing_key:
            return False, f"Duplicate execution blocked: idempotency key '{idempotency_key}' was already used for execution '{existing_key.execution_run_id}'", {}

        # 2. Plan lookup
        plan = self.db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            return False, f"Plan '{plan_id}' not found", {}

        if plan.status != PlanStatus.APPROVED:
            return False, f"Cannot execute plan in status '{plan.status}'. Plan must be 'APPROVED' by an authorized planner first.", {}

        # 3. Hash verification
        if plan.plan_hash != plan_hash:
            return False, f"Security violation: Submitted plan hash does not match stored approved plan hash. Plan may have been modified.", {}

        # 4. Snapshot check
        snapshot = self.db.query(ScenarioSnapshot).filter(ScenarioSnapshot.id == plan.snapshot_id).first()
        if not snapshot:
            return False, f"Underlying scenario snapshot '{plan.snapshot_id}' not found", {}

        # Check if a newer snapshot exists for this scenario
        latest_snapshot = (
            self.db.query(ScenarioSnapshot)
            .filter(ScenarioSnapshot.scenario_id == plan.scenario_id)
            .order_by(ScenarioSnapshot.version.desc())
            .first()
        )
        if latest_snapshot and latest_snapshot.version > snapshot.version:
            plan.status = PlanStatus.INVALIDATED
            self.db.commit()
            return False, f"Plan invalidated: Operational state has changed (snapshot v{latest_snapshot.version} supersedes plan snapshot v{snapshot.version}). Re-planning and re-approval required.", {}

        # 5. Start Execution Run
        run_id = f"EXEC-{uuid.uuid4().hex[:8].upper()}"
        execution_run = ExecutionRun(
            id=run_id,
            plan_id=plan.id,
            plan_hash=plan.plan_hash,
            executed_by_user_id=user_id,
            status=ExecutionStatus.IN_PROGRESS,
            total_actions=len(plan.actions),
            successful_actions=0,
            failed_actions=0,
            started_at=datetime.utcnow()
        )
        self.db.add(execution_run)

        # Record idempotency key
        idem_record = IdempotencyKey(
            key=idempotency_key,
            plan_id=plan.id,
            execution_run_id=run_id,
            created_at=datetime.utcnow()
        )
        self.db.add(idem_record)

        plan.status = PlanStatus.EXECUTING
        self.db.commit()

        # 6. Execute in Simulator
        network_data = json.loads(snapshot.data_payload)
        actions_list = [
            {
                "id": a.id,
                "action_type": a.action_type.value if hasattr(a.action_type, "value") else str(a.action_type),
                "origin_node_id": a.origin_node_id,
                "destination_node_id": a.destination_node_id,
                "product_id": a.product_id,
                "quantity": a.quantity,
                "start_day": a.start_day,
                "delivery_day": a.delivery_day,
                "estimated_cost": a.estimated_cost
            }
            for a in plan.actions
        ]

        sim_engine = SupplyChainSimulationEngine(network_data=network_data)
        sim_result = sim_engine.simulate(actions_list)

        # Log individual action executions
        successful_count = 0
        failed_count = 0
        for a in plan.actions:
            # All planned actions successfully dispatched in simulation
            act_log = ExecutionActionLog(
                id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
                execution_run_id=run_id,
                plan_action_id=a.id,
                status=ExecutionActionStatus.SUCCESS,
                action_type=a.action_type.value if hasattr(a.action_type, "value") else str(a.action_type),
                executed_quantity=a.quantity,
                message=f"Action successfully dispatched: {a.quantity} units of {a.product_id} to {a.destination_node_id}",
                logged_at=datetime.utcnow()
            )
            self.db.add(act_log)
            successful_count += 1

        # 7. Finalize Run
        execution_run.status = ExecutionStatus.COMPLETED
        execution_run.successful_actions = successful_count
        execution_run.failed_actions = failed_count
        execution_run.completed_at = datetime.utcnow()

        plan.status = PlanStatus.EXECUTED
        plan.updated_at = datetime.utcnow()

        # 8. Record Audit Event
        audit_ev = AuditEvent(
            id=f"AUDIT-{uuid.uuid4().hex[:8].upper()}",
            correlation_id=correlation_id,
            user_id=user_id,
            action="PLAN_EXECUTED",
            resource_type="Plan",
            resource_id=plan.id,
            details=json.dumps({
                "execution_run_id": run_id,
                "actions_executed": successful_count,
                "fill_rate": sim_result["fill_rate"],
                "total_cost": sim_result["total_cost"]
            }),
            timestamp=datetime.utcnow()
        )
        self.db.add(audit_ev)
        self.db.commit()

        return True, "Plan executed successfully in simulation environment", {
            "execution_run_id": run_id,
            "status": "COMPLETED",
            "actions_executed": successful_count,
            "simulation_metrics": sim_result
        }
