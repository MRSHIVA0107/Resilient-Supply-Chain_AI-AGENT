"""Demand Agent.
Quantifies customer demand exposure, service-sensitive priority orders,
and projected shortage timing and magnitude during the supplier disruption.
"""
import time
from typing import Dict, Any, List
from app.agents.base import BaseAgent, ReadOnlySupplyChainTools
from app.schemas.agent import AgentRunResult, AgentObservation, CandidateActionProposal
from app.models.plan import ActionType


class DemandAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="DemandAgent", prompt_version="v1.0")

    def analyze(self, tools: ReadOnlySupplyChainTools, horizon_days: int = 14) -> AgentRunResult:
        start_time = time.time()
        observations: List[AgentObservation] = []
        proposals: List[CandidateActionProposal] = []
        warnings: List[str] = []
        evidence_refs: List[str] = []

        all_demands = tools.get_demands()
        dcs = tools.get_nodes(node_type="DC")
        dc_ids = [d["id"] for d in dcs]

        # Aggregate total and daily demand per DC and product
        total_demand_by_product = {}
        daily_demand_by_dc_prod = {}
        high_priority_demand = 0.0

        for d in all_demands:
            p_id = d["product_id"]
            dc_id = d["node_id"]
            day = d["day"]
            qty = d["quantity"]

            total_demand_by_product[p_id] = total_demand_by_product.get(p_id, 0.0) + qty
            key = (dc_id, p_id, day)
            daily_demand_by_dc_prod[key] = qty

            if d.get("priority") in ["HIGH", "CRITICAL"]:
                high_priority_demand += qty

        # Compare DC demand against starting finished goods inventory
        dc_inventory = tools.get_initial_inventory()
        dc_stock_map = {}
        for inv in dc_inventory:
            if inv["node_id"] in dc_ids:
                avail = max(0.0, inv["on_hand"] - inv.get("reserved", 0.0))
                dc_stock_map[(inv["node_id"], inv["product_id"])] = avail

        total_dc_initial_fg = sum(dc_stock_map.values())
        total_p1_demand = total_demand_by_product.get("PROD-1", 0.0)
        total_p2_demand = total_demand_by_product.get("PROD-2", 0.0)

        # Observation 1: Total demand exposure
        obs_ref_1 = "DEMAND-ANALYSIS-HORIZON-TOTAL"
        evidence_refs.append(obs_ref_1)
        observations.append(AgentObservation(
            category="DEMAND_EXPOSURE",
            entity_id="NETWORK-DEMAND",
            product_id=None,
            day=None,
            description=(
                f"14-day total network demand: {total_p1_demand + total_p2_demand:,.0f} units "
                f"({total_p1_demand:,.0f} PROD-1, {total_p2_demand:,.0f} PROD-2). "
                f"High-priority service demand constitutes {high_priority_demand:,.0f} units during disruption window."
            ),
            severity="HIGH",
            evidence_ref=obs_ref_1
        ))

        # Identify shortage emergence per DC for PROD-1 (Tier-1 flagship requiring disrupted COMP-A)
        proposal_count = 1
        for dc in dc_ids:
            cum_demand = 0.0
            initial_stock = dc_stock_map.get((dc, "PROD-1"), 0.0)
            stockout_day = None

            for day in range(1, horizon_days + 1):
                d_qty = daily_demand_by_dc_prod.get((dc, "PROD-1", day), 0.0)
                cum_demand += d_qty
                if cum_demand > initial_stock and stockout_day is None:
                    stockout_day = day

            if stockout_day:
                obs_ref = f"DEMAND-SHORTAGE-{dc}-PROD-1"
                evidence_refs.append(obs_ref)
                observations.append(AgentObservation(
                    category="SHORTAGE_RISK",
                    entity_id=dc,
                    product_id="PROD-1",
                    day=stockout_day,
                    description=f"{dc} local PROD-1 inventory ({initial_stock:.0f} units) exhausts on Day {stockout_day} without upstream replenishment.",
                    severity="CRITICAL" if stockout_day <= 5 else "HIGH",
                    evidence_ref=obs_ref
                ))

                # Propose replenishment pull request to Plant-1
                prop_ref = f"PROP-DEM-{proposal_count:03d}"
                proposals.append(CandidateActionProposal(
                    proposal_id=prop_ref,
                    agent_name=self.name,
                    action_type=ActionType.SHIPMENT,
                    origin_node_id="Plant-1",
                    destination_node_id=dc,
                    product_id="PROD-1",
                    quantity=80.0,
                    start_day=max(1, stockout_day - 2),
                    delivery_day=max(2, stockout_day),
                    estimated_unit_cost=6.0,
                    total_estimated_cost=480.0,
                    rationale=f"Pre-emptive buffer replenishment to prevent stockout at {dc} on Day {stockout_day}",
                    evidence_ref=obs_ref,
                    priority_score=1.5 if stockout_day <= 4 else 1.0
                ))
                proposal_count += 1

        elapsed_ms = (time.time() - start_time) * 1000.0

        return AgentRunResult(
            agent_name=self.name,
            status="SUCCESS",
            prompt_version=self.prompt_version,
            model_provider="deterministic",
            model_identifier="rules-engine-demand-v1",
            execution_time_ms=round(elapsed_ms, 2),
            observations=observations,
            proposals=proposals,
            assumptions=[
                "Demand forecast is treated as firm requirement across the 14-day horizon.",
                "High priority demand in Days 1-7 carries severe service level penalties if unfulfilled."
            ],
            warnings=warnings,
            evidence_refs=evidence_refs,
            metrics={
                "total_demand_units": total_p1_demand + total_p2_demand,
                "high_priority_units": high_priority_demand,
                "affected_dc_nodes": len(dc_ids)
            }
        )
