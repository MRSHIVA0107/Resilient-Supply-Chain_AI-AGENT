"""Unit tests for the central deterministic coordinator."""
import pytest
from app.data.generator import generate_demonstration_network
from app.agents.coordinator import CentralCoordinator


def test_coordinator_workflow_end_to_end():
    demo = generate_demonstration_network(seed=42)
    coordinator = CentralCoordinator(horizon_days=14)
    res = coordinator.run_workflow(
        scenario_id=demo["scenario_id"],
        snapshot_version=1,
        snapshot_hash=demo["snapshot_hash"],
        network_data=demo["network_data"],
        disruptions=demo["disruptions"]
    )

    assert res["status"] in ["VALIDATED", "APPROVED"]
    assert res["solver_status"] in ["OPTIMAL", "FEASIBLE"]
    assert res["expected_fill_rate"] > 0.85
    assert len(res["actions"]) > 0
    assert len(res["plan_hash"]) == 64
    assert res["validation_results"]["is_valid"] is True


def test_coordinator_blocks_tampered_snapshot():
    demo = generate_demonstration_network(seed=42)
    coordinator = CentralCoordinator(horizon_days=14)
    # Provide corrupted hash
    with pytest.raises(ValueError, match="Snapshot integrity violation"):
        coordinator.run_workflow(
            scenario_id=demo["scenario_id"],
            snapshot_version=1,
            snapshot_hash="CORRUPTED_HASH_1234567890",
            network_data=demo["network_data"],
            disruptions=demo["disruptions"]
        )
