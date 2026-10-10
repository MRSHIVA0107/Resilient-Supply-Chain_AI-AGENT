"""Unit tests for all 8 KPI metrics and edge cases."""
import pytest
from app.evaluation.kpi import (
    calculate_fill_rate, calculate_backorder_volume, calculate_total_landed_cost,
    calculate_recovery_time_days, calculate_days_of_inventory,
    calculate_constraint_violation_rate, calculate_recommendation_stability
)


def test_kpi_1_fill_rate_exact_and_edge_case():
    assert calculate_fill_rate(950.0, 1000.0) == 0.95
    # Zero demand edge case
    assert calculate_fill_rate(0.0, 0.0) == 1.0


def test_kpi_2_backorder_volume():
    assert calculate_backorder_volume([10.0, 20.0, 5.0, 0.0]) == 35.0


def test_kpi_3_total_landed_cost():
    cost = calculate_total_landed_cost(
        procurement_cost=5000.0,
        normal_freight=800.0,
        expedited_freight=450.0,
        production_cost=1200.0,
        holding_cost=300.0,
        backorder_penalties=150.0
    )
    assert cost == 7900.0


def test_kpi_4_recovery_time_days():
    # Service rate drops in days 1-3, recovers to 96% from day 4 onward
    daily_rates = [0.80, 0.75, 0.85, 0.96, 0.98, 0.99, 1.0]
    rec_day = calculate_recovery_time_days(daily_rates, target_rate=0.95)
    assert rec_day == 4.0


def test_kpi_5_days_of_inventory():
    assert calculate_days_of_inventory(600.0, 100.0) == 6.0
    # Zero consumption edge case
    assert calculate_days_of_inventory(600.0, 0.0) == 0.0


def test_kpi_6_constraint_violation_rate():
    assert calculate_constraint_violation_rate(10, 2) == 0.2
    assert calculate_constraint_violation_rate(10, 0) == 0.0


def test_kpi_8_recommendation_stability():
    actions_a = [
        {"action_type": "PROCUREMENT", "origin_node_id": "S2", "destination_node_id": "Plant-1", "product_id": "COMP-A", "start_day": 1},
        {"action_type": "PRODUCTION", "origin_node_id": None, "destination_node_id": "Plant-1", "product_id": "PROD-1", "start_day": 2}
    ]
    actions_b = [
        {"action_type": "PROCUREMENT", "origin_node_id": "S2", "destination_node_id": "Plant-1", "product_id": "COMP-A", "start_day": 1},
        {"action_type": "PRODUCTION", "origin_node_id": None, "destination_node_id": "Plant-1", "product_id": "PROD-1", "start_day": 2}
    ]
    stability = calculate_recommendation_stability(actions_a, actions_b)
    assert stability == 100.0
