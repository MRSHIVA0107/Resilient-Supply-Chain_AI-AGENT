"""Data validation engine for supply chain records and scenarios."""
from typing import List, Dict, Any, Tuple
from app.models.supply_chain import NodeType, ProductType


class ValidationError:
    def __init__(self, record_type: str, record_id: str, field: str, message: str):
        self.record_type = record_type
        self.record_id = record_id
        self.field = field
        self.message = message

    def to_dict(self) -> Dict[str, str]:
        return {
            "record_type": self.record_type,
            "record_id": self.record_id,
            "field": self.field,
            "message": self.message
        }


def validate_network_data(data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, str]]]:
    """
    Performs comprehensive structural and domain integrity checks:
    1. Duplicate identifier checks across all entities.
    2. Non-negative constraints on capacities, lead times, inventory, and demand.
    3. Referencing integrity (foreign keys).
    4. Lead time consistency (expedited <= normal, normal > 0).
    5. BOM integrity (no self-loops, existing products, component cannot equal parent).
    6. Transit timing (arrival_day > dispatch_day).
    7. Active supplier eligibility and qualifications.
    """
    errors: List[ValidationError] = []

    nodes = data.get("nodes", [])
    products = data.get("products", [])
    boms = data.get("boms", [])
    lanes = data.get("lanes", [])
    capabilities = data.get("supplier_capabilities", [])
    inventory = data.get("initial_inventory", [])
    shipments = data.get("confirmed_inbound_shipments", [])
    demands = data.get("demands", [])

    # 1. Check duplicate IDs & collect valid ID sets
    node_ids = set()
    supplier_ids = set()
    plant_ids = set()
    dc_ids = set()
    for n in nodes:
        nid = n.get("id")
        if not nid:
            errors.append(ValidationError("Node", "MISSING_ID", "id", "Node identifier is required"))
            continue
        if nid in node_ids:
            errors.append(ValidationError("Node", nid, "id", f"Duplicate node identifier '{nid}'"))
        node_ids.add(nid)

        ntype = n.get("node_type")
        if ntype == NodeType.SUPPLIER or ntype == "SUPPLIER":
            supplier_ids.add(nid)
        elif ntype == NodeType.PLANT or ntype == "PLANT":
            plant_ids.add(nid)
        elif ntype == NodeType.DC or ntype == "DC":
            dc_ids.add(nid)

        if n.get("capacity_per_day", 0) < 0:
            errors.append(ValidationError("Node", nid, "capacity_per_day", "Daily capacity cannot be negative"))

    product_ids = set()
    raw_comp_ids = set()
    fg_ids = set()
    for p in products:
        pid = p.get("id")
        if not pid:
            errors.append(ValidationError("Product", "MISSING_ID", "id", "Product identifier is required"))
            continue
        if pid in product_ids:
            errors.append(ValidationError("Product", pid, "id", f"Duplicate product identifier '{pid}'"))
        product_ids.add(pid)

        ptype = p.get("product_type")
        if ptype == ProductType.RAW_COMPONENT or ptype == "RAW_COMPONENT":
            raw_comp_ids.add(pid)
        elif ptype == ProductType.FINISHED_GOOD or ptype == "FINISHED_GOOD":
            fg_ids.add(pid)

        if p.get("unit_holding_cost_per_day", 0) < 0:
            errors.append(ValidationError("Product", pid, "unit_holding_cost_per_day", "Holding cost cannot be negative"))
        if p.get("unit_backorder_penalty_per_day", 0) < 0:
            errors.append(ValidationError("Product", pid, "unit_backorder_penalty_per_day", "Backorder penalty cannot be negative"))

    # 2. Check BOM integrity
    bom_ids = set()
    for b in boms:
        bid = b.get("id", "UNKNOWN_BOM")
        if bid in bom_ids:
            errors.append(ValidationError("BOM", bid, "id", f"Duplicate BOM ID '{bid}'"))
        bom_ids.add(bid)

        parent = b.get("parent_product_id")
        comp = b.get("component_product_id")
        qty = b.get("quantity_required", 0)

        if parent not in product_ids:
            errors.append(ValidationError("BOM", bid, "parent_product_id", f"Parent product '{parent}' does not exist"))
        if comp not in product_ids:
            errors.append(ValidationError("BOM", bid, "component_product_id", f"Component product '{comp}' does not exist"))
        if parent == comp:
            errors.append(ValidationError("BOM", bid, "component_product_id", "Parent product cannot be its own component (self-loop)"))
        if qty <= 0:
            errors.append(ValidationError("BOM", bid, "quantity_required", "BOM component quantity must be strictly positive"))

    # 3. Check Transport Lanes
    lane_ids = set()
    for l in lanes:
        lid = l.get("id", "UNKNOWN_LANE")
        if lid in lane_ids:
            errors.append(ValidationError("TransportLane", lid, "id", f"Duplicate lane identifier '{lid}'"))
        lane_ids.add(lid)

        orig = l.get("origin_node_id")
        dest = l.get("destination_node_id")
        if orig not in node_ids:
            errors.append(ValidationError("TransportLane", lid, "origin_node_id", f"Origin node '{orig}' does not exist"))
        if dest not in node_ids:
            errors.append(ValidationError("TransportLane", lid, "destination_node_id", f"Destination node '{dest}' does not exist"))
        if orig == dest:
            errors.append(ValidationError("TransportLane", lid, "destination_node_id", "Origin and destination cannot be the same node"))

        norm_lt = l.get("normal_lead_time_days", 0)
        exp_lt = l.get("expedited_lead_time_days", 0)
        norm_cost = l.get("normal_cost_per_unit", 0)
        exp_cost = l.get("expedited_cost_per_unit", 0)

        if norm_lt <= 0:
            errors.append(ValidationError("TransportLane", lid, "normal_lead_time_days", "Normal lead time must be >= 1 day"))
        if exp_lt <= 0:
            errors.append(ValidationError("TransportLane", lid, "expedited_lead_time_days", "Expedited lead time must be >= 1 day"))
        if exp_lt > norm_lt:
            errors.append(ValidationError("TransportLane", lid, "expedited_lead_time_days", "Expedited lead time cannot exceed normal lead time"))
        if exp_cost < norm_cost:
            errors.append(ValidationError("TransportLane", lid, "expedited_cost_per_unit", "Expedited cost should not be lower than normal cost"))

    # 4. Check Supplier Capabilities
    cap_ids = set()
    for c in capabilities:
        cid = c.get("id", "UNKNOWN_CAP")
        if cid in cap_ids:
            errors.append(ValidationError("SupplierCapability", cid, "id", f"Duplicate capability ID '{cid}'"))
        cap_ids.add(cid)

        supp = c.get("supplier_id")
        prod = c.get("product_id")
        if supp not in supplier_ids:
            errors.append(ValidationError("SupplierCapability", cid, "supplier_id", f"Node '{supp}' is not a registered supplier"))
        if prod not in product_ids:
            errors.append(ValidationError("SupplierCapability", cid, "product_id", f"Product '{prod}' does not exist"))
        if c.get("unit_cost", 0) < 0:
            errors.append(ValidationError("SupplierCapability", cid, "unit_cost", "Unit cost cannot be negative"))
        if c.get("max_daily_capacity", 0) <= 0:
            errors.append(ValidationError("SupplierCapability", cid, "max_daily_capacity", "Daily supplier capacity must be > 0"))

    # 5. Check Initial Inventory
    inv_ids = set()
    for inv in inventory:
        invid = inv.get("id", "UNKNOWN_INV")
        if invid in inv_ids:
            errors.append(ValidationError("InventoryRecord", invid, "id", f"Duplicate inventory ID '{invid}'"))
        inv_ids.add(invid)

        nid = inv.get("node_id")
        pid = inv.get("product_id")
        on_hand = inv.get("on_hand", 0)
        reserved = inv.get("reserved", 0)

        if nid not in node_ids:
            errors.append(ValidationError("InventoryRecord", invid, "node_id", f"Node '{nid}' does not exist"))
        if pid not in product_ids:
            errors.append(ValidationError("InventoryRecord", invid, "product_id", f"Product '{pid}' does not exist"))
        if on_hand < 0:
            errors.append(ValidationError("InventoryRecord", invid, "on_hand", "On-hand inventory cannot be negative"))
        if reserved < 0:
            errors.append(ValidationError("InventoryRecord", invid, "reserved", "Reserved inventory cannot be negative"))
        if reserved > on_hand:
            errors.append(ValidationError("InventoryRecord", invid, "reserved", f"Reserved stock ({reserved}) exceeds physical on-hand ({on_hand})"))

    # 6. Check Inbound Shipments
    shipment_ids = set()
    for s in shipments:
        sid = s.get("id", "UNKNOWN_SHIP")
        if sid in shipment_ids:
            errors.append(ValidationError("ConfirmedShipment", sid, "id", f"Duplicate shipment ID '{sid}'"))
        shipment_ids.add(sid)

        orig = s.get("origin_node_id")
        dest = s.get("destination_node_id")
        pid = s.get("product_id")
        qty = s.get("quantity", 0)
        disp = s.get("dispatch_day", 0)
        arr = s.get("arrival_day", 0)

        if orig not in node_ids:
            errors.append(ValidationError("ConfirmedShipment", sid, "origin_node_id", f"Origin '{orig}' does not exist"))
        if dest not in node_ids:
            errors.append(ValidationError("ConfirmedShipment", sid, "destination_node_id", f"Destination '{dest}' does not exist"))
        if pid not in product_ids:
            errors.append(ValidationError("ConfirmedShipment", sid, "product_id", f"Product '{pid}' does not exist"))
        if qty <= 0:
            errors.append(ValidationError("ConfirmedShipment", sid, "quantity", "Shipment quantity must be > 0"))
        if arr <= disp:
            errors.append(ValidationError("ConfirmedShipment", sid, "arrival_day", f"Arrival day ({arr}) must be strictly after dispatch day ({disp})"))

    # 7. Check Demand Records
    demand_ids = set()
    for d in demands:
        did = d.get("id", "UNKNOWN_DEMAND")
        if did in demand_ids:
            errors.append(ValidationError("DemandRecord", did, "id", f"Duplicate demand ID '{did}'"))
        demand_ids.add(did)

        nid = d.get("node_id")
        pid = d.get("product_id")
        qty = d.get("quantity", 0)
        day = d.get("day", 0)

        if nid not in node_ids:
            errors.append(ValidationError("DemandRecord", did, "node_id", f"Demand node '{nid}' does not exist"))
        if pid not in product_ids:
            errors.append(ValidationError("DemandRecord", did, "product_id", f"Product '{pid}' does not exist"))
        if qty < 0:
            errors.append(ValidationError("DemandRecord", did, "quantity", "Demand quantity cannot be negative"))
        if day < 1:
            errors.append(ValidationError("DemandRecord", did, "day", "Demand day must be >= 1"))

    is_valid = len(errors) == 0
    return is_valid, [e.to_dict() for e in errors]
