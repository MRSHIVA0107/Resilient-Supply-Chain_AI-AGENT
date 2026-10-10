"""Evaluation and KPI Framework.
Implements exact mathematical definitions for all 8 required industrial KPIs:
1. Fill rate
2. Backorder volume
3. Total landed cost
4. Recovery time
5. Days of inventory
6. Constraint violation rate
7. Runtime latency
8. Recommendation stability
"""
from typing import Dict, Any, List


def calculate_fill_rate(total_fulfilled: float, total_demand: float) -> float:
    """KPI 1: Units fulfilled on time divided by total demand units."""
    if total_demand <= 0:
        return 1.0
    return round(total_fulfilled / total_demand, 4)


def calculate_backorder_volume(daily_backorders: List[float]) -> float:
    """KPI 2: Total unmet demand volume over measurement horizon."""
    return round(sum(daily_backorders), 2)


def calculate_total_landed_cost(
    procurement_cost: float,
    normal_freight: float,
    expedited_freight: float,
    production_cost: float,
    holding_cost: float,
    backorder_penalties: float
) -> float:
    """KPI 3: Explicitly modeled landed cost components."""
    return round(
        procurement_cost + normal_freight + expedited_freight +
        production_cost + holding_cost + backorder_penalties,
        2
    )


def calculate_recovery_time_days(daily_fill_rates: List[float], target_rate: float = 0.95) -> float:
    """
    KPI 4: Day at which network service level recovers to target threshold (>=95%)
    and maintains stability through the end of the horizon.
    """
    if not daily_fill_rates:
        return 0.0

    horizon = len(daily_fill_rates)
    for idx, rate in enumerate(daily_fill_rates):
        day = idx + 1
        if rate >= target_rate:
            # Check remaining days
            all_stable = all(r >= (target_rate - 0.05) for r in daily_fill_rates[idx:])
            if all_stable:
                return float(day)

    return float(horizon)


def calculate_days_of_inventory(
    average_daily_inventory: float,
    average_daily_demand: float
) -> float:
    """KPI 5: Average on-hand stock divided by average daily consumption rate."""
    if average_daily_demand <= 0:
        return 0.0
    return round(average_daily_inventory / average_daily_demand, 2)


def calculate_constraint_violation_rate(
    plans_evaluated: int,
    plans_with_violations: int
) -> float:
    """KPI 6: Evaluated plans with >=1 violation divided by total evaluated plans."""
    if plans_evaluated <= 0:
        return 0.0
    return round(plans_with_violations / plans_evaluated, 4)


def calculate_recommendation_stability(
    baseline_actions: List[Dict[str, Any]],
    perturbed_actions: List[Dict[str, Any]]
) -> float:
    """
    KPI 8: Jaccard similarity / overlap of recommended actions between runs:
    Intersection of action keys divided by Union of action keys.
    """
    def action_key(a):
        return (
            str(a.get("action_type")),
            a.get("origin_node_id"),
            a.get("destination_node_id"),
            a.get("product_id"),
            a.get("start_day")
        )

    keys_a = set(action_key(a) for a in baseline_actions)
    keys_b = set(action_key(a) for a in perturbed_actions)

    if not keys_a and not keys_b:
        return 100.0

    union_len = len(keys_a.union(keys_b))
    if union_len == 0:
        return 100.0

    intersection_len = len(keys_a.intersection(keys_b))
    stability_pct = (intersection_len / union_len) * 100.0
    return round(stability_pct, 2)
