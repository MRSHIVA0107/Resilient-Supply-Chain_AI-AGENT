"""End-to-end integration tests for FastAPI REST APIs."""
import pytest
from starlette.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["database"] == "HEALTHY"


def test_auth_login_flow(client):
    # Log in as default seeded planner
    res = client.post("/auth/login", json={"username": "planner", "password": "planner123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "planner"
    assert data["user"]["role"] == "PLANNER"


def test_full_scenario_agent_plan_execution_workflow(client):
    # 1. Login
    login_res = client.post("/auth/login", json={"username": "planner", "password": "planner123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. List scenarios
    scens_res = client.get("/scenarios", headers=headers)
    assert scens_res.status_code == 200
    scenarios = scens_res.json()
    assert len(scenarios) > 0
    scen_id = scenarios[0]["id"]

    # 3. Run agents
    agent_res = client.post(f"/scenarios/{scen_id}/run-agents", headers=headers)
    assert agent_res.status_code == 200
    agent_data = agent_res.json()
    assert "agent_results" in agent_data
    assert "demand_agent" in agent_data["agent_results"]
    assert "supplier_risk_agent" in agent_data["agent_results"]

    # 4. Generate recovery plan
    plan_res = client.post(f"/scenarios/{scen_id}/generate-plan", headers=headers)
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    plan_id = plan_data["id"]
    plan_hash = plan_data["plan_hash"]
    assert plan_data["status"] == "AWAITING_APPROVAL"
    assert len(plan_data["actions"]) > 0

    # 5. Approve plan
    approve_res = client.post(
        f"/plans/{plan_id}/approve",
        headers=headers,
        json={"plan_hash": plan_hash, "decision": "APPROVED", "comments": "Approved by senior planner"}
    )
    assert approve_res.status_code == 200
    approved_plan = approve_res.json()
    assert approved_plan["status"] == "APPROVED"

    # 6. Execute plan in simulator
    exec_res = client.post(
        f"/plans/{plan_id}/execute",
        headers=headers,
        json={"plan_hash": plan_hash, "idempotency_key": f"IDEM-TEST-{plan_id}"}
    )
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["success"] is True

    # 7. Run Benchmark
    bm_res = client.post(f"/scenarios/{scen_id}/benchmark", headers=headers)
    assert bm_res.status_code == 200
    bm_data = bm_res.json()
    assert len(bm_data["metrics"]) == 3
    assert len(bm_data["comparison_table"]) == 8

    # 8. Check Audit Trail
    audit_res = client.get("/audit", headers=headers)
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) > 0
