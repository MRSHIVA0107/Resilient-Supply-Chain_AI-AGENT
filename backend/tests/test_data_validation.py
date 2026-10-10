"""Unit tests for supply chain data validation and integrity."""
import pytest
from app.data.generator import generate_demonstration_network
from app.data.validator import validate_network_data


def test_valid_demonstration_network():
    demo = generate_demonstration_network(seed=42)
    is_valid, errors = validate_network_data(demo["network_data"])
    assert is_valid is True
    assert len(errors) == 0


def test_reject_duplicate_node_ids():
    demo = generate_demonstration_network(seed=42)
    data = demo["network_data"]
    # Duplicate node
    data["nodes"].append(data["nodes"][0])
    is_valid, errors = validate_network_data(data)
    assert is_valid is False
    assert any("Duplicate node identifier" in e["message"] for e in errors)


def test_reject_negative_inventory_and_reserved_exceeding():
    demo = generate_demonstration_network(seed=42)
    data = demo["network_data"]
    # Corrupt an inventory record: reserved > on_hand
    data["initial_inventory"][0]["reserved"] = data["initial_inventory"][0]["on_hand"] + 500.0
    is_valid, errors = validate_network_data(data)
    assert is_valid is False
    assert any("exceeds physical on-hand" in e["message"] for e in errors)


def test_reject_unknown_foreign_key_references():
    demo = generate_demonstration_network(seed=42)
    data = demo["network_data"]
    # Unknown destination node on transport lane
    data["lanes"][0]["destination_node_id"] = "NON_EXISTENT_PLANT"
    is_valid, errors = validate_network_data(data)
    assert is_valid is False
    assert any("Destination node 'NON_EXISTENT_PLANT' does not exist" in e["message"] for e in errors)


def test_reject_impossible_lead_times():
    demo = generate_demonstration_network(seed=42)
    data = demo["network_data"]
    # Expedited lead time > normal lead time
    data["lanes"][0]["expedited_lead_time_days"] = data["lanes"][0]["normal_lead_time_days"] + 5
    is_valid, errors = validate_network_data(data)
    assert is_valid is False
    assert any("Expedited lead time cannot exceed normal lead time" in e["message"] for e in errors)
