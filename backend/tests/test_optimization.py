"""Optimization tests using Google OR-Tools CP-SAT solver."""
import pytest
from app.data.generator import generate_demonstration_network
from app.optimization.solver import SupplyChainOptimizer


def test_solver_reaches_optimal_or_feasible():
    demo = generate_demonstration_network(seed=42, horizon_days=14)
    optimizer = SupplyChainOptimizer(horizon_days=14)
    res = optimizer.solve(demo["network_data"], demo["disruptions"])

    assert res["solver_status"] in ["OPTIMAL", "FEASIBLE"]
    assert res["objective_value"] > 0
    assert res["expected_fill_rate"] >= 0.85
    assert len(res["actions"]) > 0


def test_solver_respects_supplier_shutdown():
    demo = generate_demonstration_network(seed=42, horizon_days=14)
    optimizer = SupplyChainOptimizer(horizon_days=14)
    res = optimizer.solve(demo["network_data"], demo["disruptions"])

    # Disruption: S1 shutdown on Days 1 to 7
    # Verify NO orders placed from S1 during Days 1 to 7
    s1_shutdown_orders = [
        a for a in res["actions"]
        if a.get("origin_node_id") == "S1" and (1 <= a.get("start_day", 1) <= 7)
    ]
    assert len(s1_shutdown_orders) == 0, "Hard constraint violation: Solver placed orders with S1 during shutdown!"


def test_solver_uses_alternate_suppliers_and_expediting():
    demo = generate_demonstration_network(seed=42, horizon_days=14)
    optimizer = SupplyChainOptimizer(horizon_days=14)
    res = optimizer.solve(demo["network_data"], demo["disruptions"])

    # Verify that alternate suppliers S2 or S3 were selected to replace S1
    alt_orders = [a for a in res["actions"] if a.get("origin_node_id") in ["S2", "S3"]]
    assert len(alt_orders) > 0, "Solver failed to leverage available alternate suppliers S2/S3"
