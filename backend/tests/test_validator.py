"""Unit tests for the independent plan validator."""
import pytest
from app.data.generator import generate_demonstration_network
from app.optimization.validator import IndependentPlanValidator
from app.models.plan import ActionType


def test_validator_detects_illegal_supplier_order_during_outage():
    demo = generate_demonstration_network(seed=42)
    validator = IndependentPlanValidator(demo["network_data"], demo["disruptions"])

    # Illegal action: Order placed with S1 on Day 3 (during Days 1-7 outage)
    illegal_action = {
        "action_type": ActionType.PROCUREMENT,
        "origin_node_id": "S1",
        "destination_node_id": "Plant-1",
        "product_id": "COMP-A",
        "quantity": 100.0,
        "start_day": 3,
        "delivery_day": 6,
        "estimated_cost": 3000.0
    }

    is_valid, violations, metrics = validator.validate_plan([illegal_action])
    assert is_valid is False
    assert len(violations) > 0
    assert any("HARD CONSTRAINT VIOLATION: Order placed with supplier 'S1'" in v for v in violations)


def test_validator_detects_capacity_overruns():
    demo = generate_demonstration_network(seed=42)
    validator = IndependentPlanValidator(demo["network_data"], demo["disruptions"])

    # Overrun action: S2 max capacity is 350, order 10,000
    overrun_action = {
        "action_type": ActionType.PROCUREMENT,
        "origin_node_id": "S2",
        "destination_node_id": "Plant-1",
        "product_id": "COMP-A",
        "quantity": 10000.0,
        "start_day": 1,
        "delivery_day": 3,
        "estimated_cost": 320000.0
    }

    is_valid, violations, metrics = validator.validate_plan([overrun_action])
    assert is_valid is False
    assert any("capacity exceeded" in v for v in violations)
