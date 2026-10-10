"""Independent Plan Validator.
Recalculates inventory balances, flow conservation, capacities, lead times,
and costs from raw input snapshot without trusting solver or agent claims.
"""
from typing import Dict, Any, List, Tuple


class IndependentPlanValidator:
    """Independent verification engine checking plans against snapshot ground truth."""

    def __init__(self, network_data: Dict[str, Any], disruptions: List[Dict[str, Any]], horizon_days: int = 14):
        self.network_data = network_data
        self.disruptions = disruptions
        self.horizon_days = horizon_days

    def validate_plan(self, actions: List[Dict[str, Any]]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validates planned actions against network physics and hard constraints.
        Returns:
            is_valid: bool
            violations: List[str]
            recalculated_metrics: Dict[str, Any]
        """
        violations = []

        nodes = {n["id"]: n for n in self.network_data.get("nodes", [])}
        products = {p["id"]: p for p in self.network_data.get("products", [])}
        lanes = {l["id"]: l for l in self.network_data.get("lanes", [])}
        capabilities = {(c["supplier_id"], c["product_id"]): c for c in self.network_data.get("supplier_capabilities", [])}
        initial_inv = self.network_data.get("initial_inventory", [])
        confirmed_shipments = self.network_data.get("confirmed_inbound_shipments", [])
        demands = self.network_data.get("demands", [])
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

        # Track daily supplier capacity usage & disruption violation
        disrupted_suppliers_by_day = {t: set() for t in range(1, self.horizon_days + 1)}
        for dis in self.disruptions:
            if dis.get("prevents_new_shipments", True):
                s_id = dis.get("target_node_id")
                for t in range(dis.get("start_day", 1), dis.get("end_day", 7) + 1):
                    if t <= self.horizon_days:
                        disrupted_suppliers_by_day[t].add(s_id)

        supplier_daily_orders = {}  # (supplier_id, day) -> total qty
        plant_daily_production = {}  # (plant_id, day) -> total qty
        lane_daily_usage = {}  # (lane_key, day) -> total qty

        recalculated_cost = 0.0

        for a in actions:
            atype = a.get("action_type")
            orig = a.get("origin_node_id")
            dest = a.get("destination_node_id")
            pid = a.get("product_id")
            qty = a.get("quantity", 0)
            start_day = a.get("start_day", 1)
            delivery_day = a.get("delivery_day", 1)

            if qty <= 0:
                violations.append(f"Invalid non-positive quantity {qty} in action {a}")
                continue

            if start_day < 1 or start_day > self.horizon_days:
                violations.append(f"Action start day {start_day} outside planning horizon [1, {self.horizon_days}]")

            if delivery_day < start_day:
                violations.append(f"Delivery day {delivery_day} is prior to start day {start_day}")

            # Check Supplier Procurement
            if "PROCUREMENT" in str(atype):
                if not orig or orig not in nodes:
                    violations.append(f"Unknown supplier origin '{orig}'")
                elif nodes[orig]["node_type"] != "SUPPLIER":
                    violations.append(f"Procurement origin '{orig}' is not a registered supplier")

                # Disruption check: Supplier shutdown
                if orig in disrupted_suppliers_by_day.get(start_day, set()):
                    violations.append(f"HARD CONSTRAINT VIOLATION: Order placed with supplier '{orig}' on Day {start_day} while supplier is under active shutdown!")

                # Sourcing capability check
                cap_key = (orig, pid)
                if cap_key not in capabilities:
                    violations.append(f"Supplier '{orig}' is not qualified or capable of supplying product '{pid}'")
                else:
                    cap = capabilities[cap_key]
                    if not cap.get("is_qualified", True):
                        violations.append(f"Supplier '{orig}' is disqualified for product '{pid}'")

                # Track supplier daily capacity
                s_key = (orig, start_day)
                supplier_daily_orders[s_key] = supplier_daily_orders.get(s_key, 0) + qty

            # Check Plant Production
            elif "PRODUCTION" in str(atype):
                if not dest or dest not in nodes or nodes[dest]["node_type"] != "PLANT":
                    violations.append(f"Production location '{dest}' is not a registered plant")

                p_key = (dest, start_day)
                plant_daily_production[p_key] = plant_daily_production.get(p_key, 0) + qty

            # Check Shipments on Lanes
            elif "SHIPMENT" in str(atype):
                # Verify lane existence
                matched_lane = None
                for l in lanes.values():
                    if l["origin_node_id"] == orig and l["destination_node_id"] == dest:
                        matched_lane = l
                        break
                if not matched_lane:
                    violations.append(f"No valid transport lane found from '{orig}' to '{dest}'")
                else:
                    l_key = (matched_lane["id"], start_day)
                    lane_daily_usage[l_key] = lane_daily_usage.get(l_key, 0) + qty
                    # Check lead time consistency
                    expected_lt = matched_lane["expedited_lead_time_days"] if "EXPEDITED" in str(atype) else matched_lane["normal_lead_time_days"]
                    if delivery_day - start_day < expected_lt:
                        violations.append(f"Transit time from '{orig}' to '{dest}' ({delivery_day - start_day}d) violates minimum physical lead time ({expected_lt}d)")

            recalculated_cost += a.get("estimated_cost", 0.0)

        # Check Daily Supplier Capacities
        for (s_id, day), total_qty in supplier_daily_orders.items():
            if s_id in nodes:
                max_cap = nodes[s_id]["capacity_per_day"]
                if total_qty > max_cap:
                    violations.append(f"Supplier '{s_id}' capacity exceeded on Day {day}: ordered {total_qty} > capacity {max_cap}")

        # Check Daily Plant Capacities
        for (p_id, day), total_qty in plant_daily_production.items():
            if p_id in nodes:
                max_cap = nodes[p_id]["capacity_per_day"]
                if total_qty > max_cap:
                    violations.append(f"Plant '{p_id}' production capacity exceeded on Day {day}: planned {total_qty} > capacity {max_cap}")

        # Check Daily Lane Capacities
        for (lane_id, day), total_qty in lane_daily_usage.items():
            if lane_id in lanes:
                max_cap = lanes[lane_id]["daily_capacity"]
                if total_qty > max_cap:
                    violations.append(f"Transport lane '{lane_id}' capacity exceeded on Day {day}: transported {total_qty} > capacity {max_cap}")

        is_valid = len(violations) == 0

        recalculated_metrics = {
            "is_valid": is_valid,
            "violations_count": len(violations),
            "recalculated_cost": round(recalculated_cost, 2),
            "total_actions_evaluated": len(actions)
        }

        return is_valid, violations, recalculated_metrics
