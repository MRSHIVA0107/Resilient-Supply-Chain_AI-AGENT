"""Supplier-Risk Agent.
Assesses supplier outages, evaluates approved alternate suppliers,
verifies capacity, cost, and lead times, and formulates candidate alternate procurement orders.
"""
import time
from typing import Dict, Any, List
from app.agents.base import BaseAgent, ReadOnlySupplyChainTools
from app.schemas.agent import AgentRunResult, AgentObservation, CandidateActionProposal
from app.models.plan import ActionType


class SupplierRiskAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="SupplierRiskAgent", prompt_version="v1.0")

    def analyze(self, tools: ReadOnlySupplyChainTools, horizon_days: int = 14) -> AgentRunResult:
        start_time = time.time()
        observations: List[AgentObservation] = []
        proposals: List[CandidateActionProposal] = []
        warnings: List[str] = []
        evidence_refs: List[str] = []

        disruptions = tools.get_disruptions()
        capabilities = tools.get_supplier_capabilities()

        # Identify disrupted suppliers
        disrupted_node_ids = set()
        for dis in disruptions:
            target = dis.get("target_node_id")
            s_day = dis.get("start_day", 1)
            e_day = dis.get("end_day", 7)
            sev = dis.get("severity", 1.0)
            disrupted_node_ids.add(target)

            obs_ref = f"SUPPLIER-DISRUPTION-{target}"
            evidence_refs.append(obs_ref)
            observations.append(AgentObservation(
                category="SUPPLIER_SHUTDOWN",
                entity_id=target,
                product_id=None,
                day=s_day,
                description=(
                    f"Supplier '{target}' is experiencing a {sev*100:.0f}% shutdown from Day {s_day} to Day {e_day}. "
                    "All new purchase orders are completely halted during this period."
                ),
                severity="CRITICAL",
                evidence_ref=obs_ref
            ))

        # Inspect candidate alternate suppliers for COMP-A
        alt_suppliers = []
        for cap in capabilities:
            supp_id = cap.get("supplier_id")
            prod_id = cap.get("product_id")
            is_qual = cap.get("is_qualified", False)

            if prod_id == "COMP-A" and supp_id not in disrupted_node_ids and is_qual:
                alt_suppliers.append(cap)
                obs_ref_alt = f"SUPPLIER-ALT-QUALIFIED-{supp_id}"
                evidence_refs.append(obs_ref_alt)
                observations.append(AgentObservation(
                    category="ALTERNATE_SOURCE_QUALIFIED",
                    entity_id=supp_id,
                    product_id="COMP-A",
                    day=None,
                    description=(
                        f"Alternate supplier '{supp_id}' is qualified for COMP-A with unit cost ${cap['unit_cost']:.2f}, "
                        f"daily capacity {cap['max_daily_capacity']} units, and lead time {cap['lead_time_days']} days."
                    ),
                    severity="LOW",
                    evidence_ref=obs_ref_alt
                ))

        if not alt_suppliers:
            warnings.append("CRITICAL: No qualified alternate suppliers available for COMP-A!")
        else:
            # Propose candidate alternate sourcing orders to Plant-1 starting immediately
            prop_idx = 1
            for alt in alt_suppliers:
                supp_id = alt["supplier_id"]
                unit_cost = alt["unit_cost"]
                lt = alt["lead_time_days"]
                prop_ref = f"PROP-SUPP-{prop_idx:03d}"
                proposals.append(CandidateActionProposal(
                    proposal_id=prop_ref,
                    agent_name=self.name,
                    action_type=ActionType.PROCUREMENT,
                    origin_node_id=supp_id,
                    destination_node_id="Plant-1",
                    product_id="COMP-A",
                    quantity=150.0,
                    start_day=1,
                    delivery_day=1 + lt,
                    estimated_unit_cost=unit_cost,
                    total_estimated_cost=150.0 * unit_cost,
                    rationale=f"Reroute procurement of critical COMP-A to qualified alternate supplier {supp_id}",
                    evidence_ref=f"SUPPLIER-ALT-QUALIFIED-{supp_id}",
                    priority_score=1.8 if supp_id == "S2" else 1.4
                ))
                prop_idx += 1

        elapsed_ms = (time.time() - start_time) * 1000.0

        return AgentRunResult(
            agent_name=self.name,
            status="SUCCESS",
            prompt_version=self.prompt_version,
            model_provider="deterministic",
            model_identifier="rules-engine-supplier-v1",
            execution_time_ms=round(elapsed_ms, 2),
            observations=observations,
            proposals=proposals,
            assumptions=[
                "Alternate supplier capacities and pricing are confirmed under master service agreements.",
                "Orders placed on Day 1 will be acknowledged without supplier lead time drift."
            ],
            warnings=warnings,
            evidence_refs=evidence_refs,
            metrics={
                "disrupted_suppliers_count": len(disrupted_node_ids),
                "qualified_alternate_suppliers": len(alt_suppliers)
            }
        )
