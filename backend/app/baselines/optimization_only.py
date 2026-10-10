"""Baseline 2: Pure mathematical optimization without agent intervention discovery."""
import time
from typing import Dict, Any, List
from app.optimization.solver import SupplyChainOptimizer


def run_optimization_only_baseline(
    network_data: Dict[str, Any],
    disruptions: List[Dict[str, Any]],
    horizon_days: int = 14
) -> Dict[str, Any]:
    """
    Executes standard mathematical optimization directly on the scenario snapshot.
    Uses the exact same mathematical formulation, costs, and hard constraints as the agent-assisted approach,
    providing a clean mathematical benchmark without multi-agent discovery and trade-off contextualization.
    """
    start_time = time.time()
    optimizer = SupplyChainOptimizer(horizon_days=horizon_days, time_limit_seconds=30)
    result = optimizer.solve(network_data=network_data, disruptions=disruptions)
    elapsed_ms = (time.time() - start_time) * 1000.0

    result["approach"] = "OPTIMIZATION_ONLY"
    result["workflow_duration_ms"] = round(elapsed_ms, 2)
    result["trade_off_summary"] = (
        f"Pure OR-Tools solver reached status {result['solver_status']} in {result['solver_duration_ms']}ms. "
        f"Total Landed Cost: ${result['objective_value']:,.2f}, Fill Rate: {result['expected_fill_rate']*100:.1f}%. "
        "Calculated optimal numerical flows across network without contextual agent trade-off analysis."
    )
    return result
