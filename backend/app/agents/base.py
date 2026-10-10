"""Base definitions, read-only tools, and prompt governance for specialized agents."""
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from app.schemas.agent import AgentRunResult, AgentObservation, CandidateActionProposal


class ReadOnlySupplyChainTools:
    """Read-only sandbox providing bounded queries over the immutable scenario snapshot."""

    def __init__(self, network_data: Dict[str, Any], disruptions: List[Dict[str, Any]]):
        self.network_data = network_data
        self.disruptions = disruptions

    def get_nodes(self, node_type: Optional[str] = None) -> List[Dict[str, Any]]:
        nodes = self.network_data.get("nodes", [])
        if node_type:
            return [n for n in nodes if n.get("node_type") == node_type]
        return nodes

    def get_products(self) -> List[Dict[str, Any]]:
        return self.network_data.get("products", [])

    def get_demands(self, node_id: Optional[str] = None, day_range: Optional[tuple] = None) -> List[Dict[str, Any]]:
        demands = self.network_data.get("demands", [])
        filtered = demands
        if node_id:
            filtered = [d for d in filtered if d.get("node_id") == node_id]
        if day_range:
            start_d, end_d = day_range
            filtered = [d for d in filtered if start_d <= d.get("day", 1) <= end_d]
        return filtered

    def get_initial_inventory(self, node_id: Optional[str] = None, product_id: Optional[str] = None) -> List[Dict[str, Any]]:
        inv = self.network_data.get("initial_inventory", [])
        if node_id:
            inv = [i for i in inv if i.get("node_id") == node_id]
        if product_id:
            inv = [i for i in inv if i.get("product_id") == product_id]
        return inv

    def get_supplier_capabilities(self, supplier_id: Optional[str] = None, product_id: Optional[str] = None) -> List[Dict[str, Any]]:
        caps = self.network_data.get("supplier_capabilities", [])
        if supplier_id:
            caps = [c for c in caps if c.get("supplier_id") == supplier_id]
        if product_id:
            caps = [c for c in caps if c.get("product_id") == product_id]
        return caps

    def get_transport_lanes(self, origin_id: Optional[str] = None, destination_id: Optional[str] = None) -> List[Dict[str, Any]]:
        lanes = self.network_data.get("lanes", [])
        if origin_id:
            lanes = [l for l in lanes if l.get("origin_node_id") == origin_id]
        if destination_id:
            lanes = [l for l in lanes if l.get("destination_node_id") == destination_id]
        return lanes

    def get_disruptions(self) -> List[Dict[str, Any]]:
        return self.disruptions

    def get_inbound_confirmed_shipments(self, destination_id: Optional[str] = None) -> List[Dict[str, Any]]:
        ships = self.network_data.get("confirmed_inbound_shipments", [])
        if destination_id:
            return [s for s in ships if s.get("destination_node_id") == destination_id]
        return ships


class BaseAgent(ABC):
    """Abstract base class for all domain agents."""

    SYSTEM_INSTRUCTION = (
        "You are a bounded supply-chain analysis agent. Analyze only your assigned operational area "
        "using the validated scenario snapshot and permitted read-only tools. Do not invent operational facts, "
        "costs, quantities, capacities, lead times, supplier availability or service constraints. Distinguish "
        "verified facts, assumptions and missing information. Return only the required structured output. "
        "Propose candidate actions but never select the authoritative final plan, approve it or execute it. "
        "Every material recommendation must have evidence references. If critical information is missing, "
        "report the limitation or blocked status."
    )

    def __init__(self, name: str, prompt_version: str = "v1.0"):
        self.name = name
        self.prompt_version = prompt_version

    @abstractmethod
    def analyze(self, tools: ReadOnlySupplyChainTools, horizon_days: int = 14) -> AgentRunResult:
        """Run analysis on read-only tools and produce structured AgentRunResult."""
        pass
