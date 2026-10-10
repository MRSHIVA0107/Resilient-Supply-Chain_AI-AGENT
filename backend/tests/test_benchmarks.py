"""Unit tests for multi-approach benchmarking."""
import pytest
from app.data.generator import generate_demonstration_network
from app.evaluation.benchmark_runner import run_comprehensive_benchmark


def test_fair_benchmark_execution():
    demo = generate_demonstration_network(seed=42, horizon_days=14)
    res = run_comprehensive_benchmark(
        scenario_id=demo["scenario_id"],
        network_data=demo["network_data"],
        disruptions=demo["disruptions"],
        snapshot_hash=demo["snapshot_hash"],
        db=None,
        horizon_days=14
    )

    assert len(res["metrics"]) == 3
    approaches = [m["approach"] for m in res["metrics"]]
    assert "REORDER_POINT" in approaches
    assert "OPTIMIZATION_ONLY" in approaches
    assert "AGENT_ASSISTED" in approaches

    # Check that comparison table contains all 8 required KPIs
    comp = res["comparison_table"]
    assert len(comp) == 8
    metric_names = [row["metric_name"] for row in comp]
    assert any("Fill Rate" in m for m in metric_names)
    assert any("Backorder Volume" in m for m in metric_names)
    assert any("Total Landed Cost" in m for m in metric_names)
    assert any("Recovery Time" in m for m in metric_names)
    assert any("Days of Inventory" in m for m in metric_names)
    assert any("Constraint Violation Rate" in m for m in metric_names)
    assert any("Runtime Latency" in m for m in metric_names)
    assert any("Recommendation Stability" in m for m in metric_names)
