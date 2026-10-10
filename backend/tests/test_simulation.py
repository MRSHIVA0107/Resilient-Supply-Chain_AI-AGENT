"""Unit tests for simulation engine and idempotency protection."""
import json
from datetime import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User, UserRole
from app.models.scenario import Scenario, ScenarioSnapshot
from app.models.plan import Plan, PlanAction, PlanStatus, PlanningApproach, ActionType
from app.data.generator import generate_demonstration_network
from app.simulation.executor import PlanExecutionService


@pytest.fixture
def sim_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_idempotency_prevents_duplicate_execution(sim_db):
    demo = generate_demonstration_network(seed=42)
    user = User(id="U1", username="planner", email="p@sc.org", hashed_password="pw", role=UserRole.PLANNER)
    sim_db.add(user)

    scen = Scenario(id="SCEN-01", name="Test", seed=42, horizon_days=14)
    sim_db.add(scen)

    snap = ScenarioSnapshot(
        id="SNAP-01",
        scenario_id="SCEN-01",
        version=1,
        snapshot_hash=demo["snapshot_hash"],
        data_payload=json.dumps(demo["network_data"]),
        created_at=datetime.utcnow()
    )
    sim_db.add(snap)

    plan = Plan(
        id="PLAN-01",
        scenario_id="SCEN-01",
        snapshot_id="SNAP-01",
        version=1,
        plan_hash="valid_hash_123",
        status=PlanStatus.APPROVED,
        approach=PlanningApproach.AGENT_ASSISTED,
        total_cost=5000.0,
        expected_fill_rate=0.95,
        created_at=datetime.utcnow()
    )
    sim_db.add(plan)
    sim_db.commit()

    executor = PlanExecutionService(db=sim_db)
    
    # First execution succeeds
    success1, msg1, details1 = executor.execute_plan(
        plan_id="PLAN-01",
        plan_hash="valid_hash_123",
        user_id="U1",
        idempotency_key="IDEM-UNIQUE-KEY-001",
        correlation_id="CORR-01"
    )
    assert success1 is True
    assert details1["status"] == "COMPLETED"

    # Second execution with SAME idempotency key is blocked!
    success2, msg2, details2 = executor.execute_plan(
        plan_id="PLAN-01",
        plan_hash="valid_hash_123",
        user_id="U1",
        idempotency_key="IDEM-UNIQUE-KEY-001",
        correlation_id="CORR-02"
    )
    assert success2 is False
    assert "Duplicate execution blocked" in msg2
