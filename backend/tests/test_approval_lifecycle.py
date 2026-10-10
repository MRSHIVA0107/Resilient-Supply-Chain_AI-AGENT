"""Unit tests for Plan Approval Lifecycle and Hash Security."""
import uuid
from datetime import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User, UserRole
from app.models.scenario import Scenario, ScenarioSnapshot
from app.models.plan import Plan, PlanAction, PlanStatus, PlanningApproach, ActionType
from app.simulation.executor import PlanExecutionService


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_unapproved_plan_execution_blocked(test_db):
    user = User(id="U1", username="planner", email="p@sc.org", hashed_password="pw", role=UserRole.PLANNER)
    test_db.add(user)
    plan = Plan(
        id="PLAN-01",
        scenario_id="S1",
        snapshot_id="SNAP-01",
        version=1,
        plan_hash="fake_hash",
        status=PlanStatus.DRAFT,  # DRAFT, NOT APPROVED
        approach=PlanningApproach.AGENT_ASSISTED,
        total_cost=100.0,
        expected_fill_rate=0.9,
        created_at=datetime.utcnow()
    )
    test_db.add(plan)
    test_db.commit()

    executor = PlanExecutionService(db=test_db)
    success, msg, details = executor.execute_plan(
        plan_id="PLAN-01",
        plan_hash="fake_hash",
        user_id="U1",
        idempotency_key="IDEM-01",
        correlation_id="CORR-01"
    )
    assert success is False
    assert "Plan must be 'APPROVED'" in msg


def test_hash_tampering_blocked(test_db):
    user = User(id="U1", username="planner", email="p@sc.org", hashed_password="pw", role=UserRole.PLANNER)
    test_db.add(user)
    plan = Plan(
        id="PLAN-02",
        scenario_id="S1",
        snapshot_id="SNAP-01",
        version=1,
        plan_hash="authentic_hash_123",
        status=PlanStatus.APPROVED,
        approach=PlanningApproach.AGENT_ASSISTED,
        total_cost=100.0,
        expected_fill_rate=0.9,
        created_at=datetime.utcnow()
    )
    test_db.add(plan)
    test_db.commit()

    executor = PlanExecutionService(db=test_db)
    # Pass tampered hash
    success, msg, details = executor.execute_plan(
        plan_id="PLAN-02",
        plan_hash="tampered_hash_456",
        user_id="U1",
        idempotency_key="IDEM-02",
        correlation_id="CORR-02"
    )
    assert success is False
    assert "Submitted plan hash does not match stored approved plan hash" in msg
