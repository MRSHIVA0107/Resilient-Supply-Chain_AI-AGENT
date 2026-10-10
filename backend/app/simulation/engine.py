"""Daily simulation engine for supply network dynamics."""
from typing import Dict, Any, List


class SupplyChainSimulationEngine:
    """Simulates daily execution of supply chain actions over the planning horizon."""

    def __init__(self, network_data: Dict[str, Any], horizon_days: int = 14):
        self.network_data = network_data
        self.horizon_days = horizon_days

    def simulate(self, actions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Rolls forward Day 1 to Horizon, applying planned actions, inbound arrivals,
        assembly conversions, and demand fulfilling.
        """
        nodes = {n["id"]: n for n in self.network_data.get("nodes", [])}
        products = {p["id"]: p for p in self.network_data.get("products", [])}
        demands = self.network_data.get("demands", [])
        confirmed_shipments = self.network_data.get("confirmed_inbound_shipments", [])
        initial_inv = self.network_data.get("initial_inventory", [])
        boms = self.network_data.get("boms", [])

        # BOM mapping
        bom_map = {}
        for b in boms:
            parent = b["parent_product_id"]
            comp = b["component_product_id"]
            qty = b["quantity_required"]
            if parent not in bom_map:
                bom_map[parent] = {}
            bom_map[parent][comp] = qty

        # Track inventory: (node, prod) -> float
        inv_state = {}
        for i in initial_inv:
            inv_state[(i["node_id"], i["product_id"])] = float(i["on_hand"])

        # Track pipeline arrivals: day -> list of (dest, prod, qty)
        pipeline = {t: [] for t in range(1, self.horizon_days + 1)}
        for cs in confirmed_shipments:
            arr = cs["arrival_day"]
            if arr in pipeline:
                pipeline[arr].append((cs["destination_node_id"], cs["product_id"], float(cs["quantity"])))

        # Pre-schedule planned arrivals from actions
        for a in actions:
            atype = str(a.get("action_type"))
            dest = a.get("destination_node_id")
            prod = a.get("product_id")
            qty = float(a.get("quantity", 0))
            delivery_day = a.get("delivery_day", 1)

            if "PROCUREMENT" in atype or "SHIPMENT" in atype:
                if delivery_day in pipeline:
                    pipeline[delivery_day].append((dest, prod, qty))

        daily_records = []
        total_demand = sum(d["quantity"] for d in demands)
        total_fulfilled = 0.0
        total_backorders = 0.0
        total_cost = sum(a.get("estimated_cost", 0.0) for a in actions)

        for t in range(1, self.horizon_days + 1):
            # 1. Inbound arrivals
            for dest, prod, qty in pipeline[t]:
                inv_state[(dest, prod)] = inv_state.get((dest, prod), 0.0) + qty

            # 2. Production assembly on day t
            day_prod_actions = [a for a in actions if "PRODUCTION" in str(a.get("action_type")) and a.get("start_day") == t]
            for pa in day_prod_actions:
                plant = pa.get("destination_node_id")
                fg = pa.get("product_id")
                p_qty = float(pa.get("quantity", 0))

                # Consume components per BOM
                can_assemble = True
                for comp, req in bom_map.get(fg, {}).items():
                    req_stock = req * p_qty
                    avail = inv_state.get((plant, comp), 0.0)
                    if avail < req_stock:
                        can_assemble = False
                        break

                if can_assemble:
                    for comp, req in bom_map.get(fg, {}).items():
                        inv_state[(plant, comp)] -= req * p_qty
                    inv_state[(plant, fg)] = inv_state.get((plant, fg), 0.0) + p_qty

            # 3. Deduct outbound shipments departing today
            day_ship_actions = [a for a in actions if str(a.get("action_type")) in ["SHIPMENT", "EXPEDITED_SHIPMENT"] and a.get("start_day") == t]
            for sa in day_ship_actions:
                orig = sa.get("origin_node_id")
                prod = sa.get("product_id")
                s_qty = float(sa.get("quantity", 0))
                if orig:
                    inv_state[(orig, prod)] = max(0.0, inv_state.get((orig, prod), 0.0) - s_qty)

            # 4. Fulfill customer demand at DCs
            day_demands = [d for d in demands if d.get("day") == t]
            day_fulfilled = 0.0
            day_demand_total = 0.0
            day_bo = 0.0

            for d in day_demands:
                dc = d["node_id"]
                prod = d["product_id"]
                d_qty = float(d["quantity"])
                day_demand_total += d_qty

                avail = inv_state.get((dc, prod), 0.0)
                fulfilled = min(avail, d_qty)
                bo = d_qty - fulfilled

                inv_state[(dc, prod)] -= fulfilled
                day_fulfilled += fulfilled
                day_bo += bo

            total_fulfilled += day_fulfilled
            total_backorders += day_bo

            daily_records.append({
                "day": t,
                "demand": day_demand_total,
                "fulfilled": day_fulfilled,
                "backorders": day_bo,
                "dc_stock_snapshot": {f"{k[0]}_{k[1]}": round(v, 1) for k, v in inv_state.items() if "DC" in k[0]}
            })

        fill_rate = (total_fulfilled / total_demand) if total_demand > 0 else 1.0

        return {
            "total_demand": total_demand,
            "total_fulfilled": total_fulfilled,
            "total_backorders": total_backorders,
            "fill_rate": round(fill_rate, 4),
            "total_cost": round(total_cost, 2),
            "daily_records": daily_records,
            "final_inventory_state": {f"{k[0]}_{k[1]}": round(v, 1) for k, v in inv_state.items()}
        }
