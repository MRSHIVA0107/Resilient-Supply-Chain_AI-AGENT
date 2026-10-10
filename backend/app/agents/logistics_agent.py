"""Logistics Agent.
Evaluates transport network lanes, normal vs expedited freight options,
calculates physical arrival windows, and formulates candidate expedited transport actions.
"""
import time
from typing import Dict, Any, List
from app.agents.base import BaseAgent, ReadOnlySupplyChainTools
from app.schemas.agent import AgentRunResult, AgentObservation, CandidateActionProposal
from app.models.plan import ActionType


class LogisticsAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="LogisticsAgent", prompt_version="v1.0")

    def analyze(self, tools: ReadOnlySupplyChainTools, horizon_days: int = 14) -> AgentRunResult:
        start_time = time.time()
        observations: List[AgentObservation] = []
        proposals: List[CandidateActionProposal] = []
        warnings: List[str] = []
        evidence_refs: List[str] = []

        lanes = tools.get_transport_lanes()

        # Identify fast-track lanes for alternate suppliers and downstream DCs
        expedited_capable_lanes = [l for l in lanes if l.get("expedited_lead_time_days", 0) < l.get("normal_lead_time_days", 0)]

        for lane in expedited_capable_lanes:
            obs_ref = f"LOGISTICS-EXPEDITE-CAPABILITY-{lane['id']}"
            evidence_refs.append(obs_ref)
            observations.append(AgentObservation(
                category="EXPEDITED_LANE_OPTION",
                entity_id=lane["id"],
                product_id=None,
                day=None,
                description=(
                    f"Lane {lane['origin_node_id']} -> {lane['destination_node_id']} supports 1-day expedited transit "
                    f"(saving {lane['normal_lead_time_days'] - lane['expedited_lead_time_days']} days) at premium "
                    f"${lane['expedited_cost_per_unit']:.2f}/unit (normal: ${lane['normal_cost_per_unit']:.2f}/unit)."
                ),
                severity="LOW",
                evidence_ref=obs_ref
            ))

        # Propose expedited freight from alternate supplier S2 to Plant-1 to compress initial receipt lead time
        s2_lane = next((l for l in lanes if l["origin_node_id"] == "S2" and l["destination_node_id"] == "Plant-1"), None)
        if s2_lane:
            prop_ref = "PROP-LOG-001"
            proposals.append(CandidateActionProposal(
                proposal_id=prop_ref,
                agent_name=self.name,
                action_type=ActionType.EXPEDITED_PROCUREMENT,
                origin_node_id="S2",
                destination_node_id="Plant-1",
                product_id="COMP-A",
                quantity=100.0,
                start_day=1,
                delivery_day=1 + s2_lane["expedited_lead_time_days"],
                estimated_unit_cost=s2_lane["expedited_cost_per_unit"] + 32.0,
                total_estimated_cost=100.0 * (s2_lane["expedited_cost_per_unit"] + 32.0),
                rationale="Compress S2 component delivery to 1 day to bridge Plant-1 buffer depletion on Day 3",
                evidence_ref=f"LOGISTICS-EXPEDITE-CAPABILITY-{s2_lane['id']}",
                priority_score=1.7
            ))

        # Propose expedited transport from Plant-1 to DC-North (highest demand center)
        p1_dcn_lane = next((l for l in lanes if l["origin_node_id"] == "Plant-1" and l["destination_node_id"] == "DC-North"), None)
        if p1_dcn_lane:
            prop_ref = "PROP-LOG-002"
            proposals.append(CandidateActionProposal(
                proposal_id=prop_ref,
                agent_name=self.name,
                action_type=ActionType.EXPEDITED_SHIPMENT,
                origin_node_id="Plant-1",
                destination_node_id="DC-North",
                product_id="PROD-1",
                quantity=60.0,
                start_day=2,
                delivery_day=3,
                estimated_unit_cost=p1_dcn_lane["expedited_cost_per_unit"],
                total_estimated_cost=60.0 * p1_dcn_lane["expedited_cost_per_unit"],
                rationale="Expedited lane shipment of PROD-1 to safeguard high-priority Chicago demand on Day 3",
                evidence_ref=f"LOGISTICS-EXPEDITE-CAPABILITY-{p1_dcn_lane['id']}",
                priority_score=1.4
            ))

        elapsed_ms = (time.time() - start_time) * 1000.0

        return AgentRunResult(
            agent_name=self.name,
            status="SUCCESS",
            prompt_version=self.prompt_version,
            model_provider="deterministic",
            model_identifier="rules-engine-logistics-v1",
            execution_time_ms=round(elapsed_ms, 2),
            observations=observations,
            proposals=proposals,
            assumptions=[
                "Air freight and expedited dedicated road freight slots are available within daily capacity limits.",
                "Customs clearance delays are accounted for in expedited lead time values."
            ],
            warnings=warnings,
            evidence_refs=evidence_refs,
            metrics={
                "total_lanes_evaluated": len(lanes),
                "expedited_lanes_count": len(expedited_capable_lanes)
            }
        )
