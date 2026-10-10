"""Unit tests for the four specialized agents."""
import pytest
from app.data.generator import generate_demonstration_network
from app.agents.base import ReadOnlySupplyChainTools
from app.agents.demand_agent import DemandAgent
from app.agents.inventory_agent import InventoryAgent
from app.agents.supplier_risk_agent import SupplierRiskAgent
from app.agents.logistics_agent import LogisticsAgent


@pytest.fixture
def agent_tools():
    demo = generate_demonstration_network(seed=42)
    return ReadOnlySupplyChainTools(
        network_data=demo["network_data"],
        disruptions=demo["disruptions"]
    )


def test_demand_agent_identifies_shortages(agent_tools):
    agent = DemandAgent()
    res = agent.analyze(agent_tools)
    assert res.status == "SUCCESS"
    assert len(res.observations) > 0
    assert len(res.evidence_refs) > 0
    # Checks that shortage risk for Tier-1 flagship product was flagged
    assert any(o.category == "SHORTAGE_RISK" for o in res.observations)


def test_inventory_agent_projects_runway(agent_tools):
    agent = InventoryAgent()
    res = agent.analyze(agent_tools)
    assert res.status == "SUCCESS"
    assert "plant_1_comp_a_stock" in res.metrics
    assert res.metrics["projected_runway_days"] > 0
    # Proposes immediate assembly before raw component starvation
    assert any("PROP-INV" in p.proposal_id for p in res.proposals)


def test_supplier_risk_agent_identifies_alternates(agent_tools):
    agent = SupplierRiskAgent()
    res = agent.analyze(agent_tools)
    assert res.status == "SUCCESS"
    assert res.metrics["disrupted_suppliers_count"] == 1
    # Successfully identifies qualified alternate suppliers S2 and S3
    assert res.metrics["qualified_alternate_suppliers"] >= 2
    assert any(p.origin_node_id in ["S2", "S3"] for p in res.proposals)


def test_logistics_agent_evaluates_expedited_lanes(agent_tools):
    agent = LogisticsAgent()
    res = agent.analyze(agent_tools)
    assert res.status == "SUCCESS"
    assert res.metrics["expedited_lanes_count"] > 0
    assert any("EXPEDITED" in str(p.action_type) for p in res.proposals)
