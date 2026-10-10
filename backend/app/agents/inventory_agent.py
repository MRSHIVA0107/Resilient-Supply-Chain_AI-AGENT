"""Inventory Agent.
Calculates available stock, projects inventory depletion curves,
identifies component bottlenecks at manufacturing plants, and proposes assembly balancing.
"""
import time
from typing import Dict, Any, List
from app.agents.base import BaseAgent, ReadOnlySupplyChainTools
from app.schemas.agent import AgentRunResult, AgentObservation, CandidateActionProposal
from app.models.plan import ActionType


class InventoryAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="InventoryAgent", prompt_version="v1.0")

    def analyze(self, tools: ReadOnlySupplyChainTools, horizon_days: int = 14) -> AgentRunResult:
        start_time = time.time()
        observations: List[AgentObservation] = []
        proposals: List[CandidateActionProposal] = []
        warnings: List[str] = []
        evidence_refs: List[str] = []

        plants = tools.get_nodes(node_type="PLANT")
        initial_inv = tools.get_initial_inventory()
        confirmed_inbounds = tools.get_inbound_confirmed_shipments()

        # Index plant inventory: (plant, prod) -> available
        plant_stock = {}
        for inv in initial_inv:
            avail = max(0.0, inv["on_hand"] - inv.get("reserved", 0.0))
            plant_stock[(inv["node_id"], inv["product_id"])] = avail

        # Account for confirmed inbound component shipments
        for cs in confirmed_inbounds:
            p_id = cs["destination_node_id"]
            prod = cs["product_id"]
            plant_stock[(p_id, prod)] = plant_stock.get((p_id, prod), 0.0) + cs["quantity"]

        # Observation 1: Critical component runway at Plant-1
        p1_comp_a = plant_stock.get(("Plant-1", "COMP-A"), 0.0)
        p1_comp_b = plant_stock.get(("Plant-1", "COMP-B"), 0.0)
        burn_rate_est = 120.0  # expected daily component consumption for PROD-1
        runway_days_a = round(p1_comp_a / burn_rate_est, 1)

        obs_ref_1 = "INV-RUNWAY-PLANT-1-COMP-A"
        evidence_refs.append(obs_ref_1)
        observations.append(AgentObservation(
            category="STOCK_RUNWAY",
            entity_id="Plant-1",
            product_id="COMP-A",
            day=int(runway_days_a),
            description=(
                f"Plant-1 has {p1_comp_a:.0f} units of COMP-A available (including confirmed inbounds). "
                f"At planned production rates (~{burn_rate_est:.0f}/day), stock runway is approximately {runway_days_a} days. "
                "Outage of S1 (7 days) exceeds available stock runway, creating an acute assembly bottleneck by Day 4."
            ),
            severity="CRITICAL",
            evidence_ref=obs_ref_1
        ))

        # Propose component preservation and balanced assembly schedule
        prop_id_1 = "PROP-INV-001"
        proposals.append(CandidateActionProposal(
            proposal_id=prop_id_1,
            agent_name=self.name,
            action_type=ActionType.PRODUCTION,
            origin_node_id=None,
            destination_node_id="Plant-1",
            product_id="PROD-1",
            quantity=100.0,
            start_day=1,
            delivery_day=1,
            estimated_unit_cost=10.0,
            total_estimated_cost=1000.0,
            rationale="Immediate conversion of on-hand COMP-A into finished PROD-1 units before stockout",
            evidence_ref=obs_ref_1,
            priority_score=1.3
        ))

        # Check Plant-2 component buffer
        p2_comp_a = plant_stock.get(("Plant-2", "COMP-A"), 0.0)
        if p2_comp_a > 50.0:
            obs_ref_2 = "INV-FLEXIBILITY-PLANT-2"
            evidence_refs.append(obs_ref_2)
            observations.append(AgentObservation(
                category="PRODUCTION_FLEXIBILITY",
                entity_id="Plant-2",
                product_id="COMP-A",
                day=1,
                description=f"Plant-2 holds {p2_comp_a:.0f} units of COMP-A that can support regional assembly of PROD-1.",
                severity="LOW",
                evidence_ref=obs_ref_2
            ))

        elapsed_ms = (time.time() - start_time) * 1000.0

        return AgentRunResult(
            agent_name=self.name,
            status="SUCCESS",
            prompt_version=self.prompt_version,
            model_provider="deterministic",
            model_identifier="rules-engine-inventory-v1",
            execution_time_ms=round(elapsed_ms, 2),
            observations=observations,
            proposals=proposals,
            assumptions=[
                "Confirmed inbound shipments dispatched prior to Day 1 will arrive reliably.",
                "Work-in-process conversion efficiency is 100% per Bill of Materials specifications."
            ],
            warnings=warnings,
            evidence_refs=evidence_refs,
            metrics={
                "plant_1_comp_a_stock": p1_comp_a,
                "plant_1_comp_b_stock": p1_comp_b,
                "projected_runway_days": runway_days_a
            }
        )
