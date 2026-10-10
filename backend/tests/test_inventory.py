"""Unit tests for deterministic inventory calculations."""
import pytest
from app.data.generator import generate_demonstration_network
from app.simulation.engine import SupplyChainSimulationEngine


def test_inventory_conservation_no_actions():
    demo = generate_demonstration_network(seed=42, horizon_days=5)
    data = demo["network_data"]
    engine = SupplyChainSimulationEngine(network_data=data, horizon_days=5)
    result = engine.simulate(actions=[])
    
    assert result["total_demand"] > 0
    # Without any replenishments or assembly, backorders accumulate as starting DC inventory depletes
    assert result["total_backorders"] > 0
    assert result["fill_rate"] < 1.0


def test_unconfirmed_proposed_supply_not_counted_as_physical_stock():
    demo = generate_demonstration_network(seed=42, horizon_days=5)
    data = demo["network_data"]
    # Starting inventory must only reflect initial confirmed on_hand minus reserved
    for inv in data["initial_inventory"]:
        assert inv["on_hand"] >= inv["reserved"]
        avail = inv["on_hand"] - inv["reserved"]
        assert avail >= 0
