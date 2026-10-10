"""Agents router for running domain agents."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.scenario import ScenarioSnapshot, DisruptionEvent
from app.agents.base import ReadOnlySupplyChainTools
from app.agents.demand_agent import DemandAgent
from app.agents.inventory_agent import InventoryAgent
from app.agents.supplier_risk_agent import SupplierRiskAgent
from app.agents.logistics_agent import LogisticsAgent
from app.api.deps import require_planner

router = APIRouter(prefix="/scenarios", tags=["Agents"])


@router.post("/{scenario_id}/run-agents")
def run_agents(
    scenario_id: str,
    current_user = Depends(require_planner),
    db: Session = Depends(get_db)
):
    """
    Executes the four specialized domain agents (Demand, Inventory, Supplier-Risk, Logistics)
    against the verified scenario snapshot.
    """
    snapshot = (
        db.query(ScenarioSnapshot)
        .filter(ScenarioSnapshot.scenario_id == scenario_id)
        .order_by(ScenarioSnapshot.version.desc())
        .first()
    )
    if not snapshot:
        raise HTTPException(status_code=404, detail="Scenario snapshot not found")

    disruptions_db = db.query(DisruptionEvent).filter(DisruptionEvent.scenario_id == scenario_id).all()
    disruptions = [
        {
            "id": d.id,
            "target_node_id": d.target_node_id,
            "start_day": d.start_day,
            "end_day": d.end_day,
            "severity": d.severity,
            "prevents_new_shipments": d.prevents_new_shipments,
            "prevents_in_transit_receipts": d.prevents_in_transit_receipts
        }
        for d in disruptions_db
    ]

    network_data = json.loads(snapshot.data_payload)
    tools = ReadOnlySupplyChainTools(network_data=network_data, disruptions=disruptions)

    demand_agent = DemandAgent()
    inventory_agent = InventoryAgent()
    supplier_risk_agent = SupplierRiskAgent()
    logistics_agent = LogisticsAgent()

    results = {
        "demand_agent": demand_agent.analyze(tools).dict(),
        "inventory_agent": inventory_agent.analyze(tools).dict(),
        "supplier_risk_agent": supplier_risk_agent.analyze(tools).dict(),
        "logistics_agent": logistics_agent.analyze(tools).dict(),
    }

    return {
        "scenario_id": scenario_id,
        "snapshot_version": snapshot.version,
        "snapshot_hash": snapshot.snapshot_hash,
        "agent_results": results
    }
