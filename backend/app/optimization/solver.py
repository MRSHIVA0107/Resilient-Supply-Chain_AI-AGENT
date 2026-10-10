"""Mathematical optimization model using Google OR-Tools CP-SAT solver."""
import time
from typing import Dict, Any, List, Tuple
from ortools.sat.python import cp_model
from app.models.plan import ActionType


class SupplyChainOptimizer:
    """
    Constrained Multi-Echelon Supply Network Optimizer.
    Formulates a mixed-integer linear constraint satisfaction and optimization problem
    over a multi-period horizon under supplier disruptions.
    """

    def __init__(self, horizon_days: int = 14, time_limit_seconds: int = 30):
        self.horizon_days = horizon_days
        self.time_limit_seconds = time_limit_seconds

    def solve(
        self,
        network_data: Dict[str, Any],
        disruptions: List[Dict[str, Any]],
        candidate_restrictions: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Builds and solves the optimization model.
        Returns:
            solver_status: OPTIMAL, FEASIBLE, INFEASIBLE, MODEL_INVALID, TIMEOUT
            objective_value: float
            actions: List of planned actions (orders, shipments, production)
            diagnostics: Dict of constraint usage and solving details
        """
        start_time = time.time()
        model = cp_model.CpModel()

        nodes = {n["id"]: n for n in network_data.get("nodes", [])}
        products = {p["id"]: p for p in network_data.get("products", [])}
        boms = network_data.get("boms", [])
        lanes = network_data.get("lanes", [])
        capabilities = network_data.get("supplier_capabilities", [])
        initial_inv = network_data.get("initial_inventory", [])
        confirmed_shipments = network_data.get("confirmed_inbound_shipments", [])
        demands = network_data.get("demands", [])

        # Index helper structures
        suppliers = [nid for nid, n in nodes.items() if n["node_type"] == "SUPPLIER"]
        plants = [nid for nid, n in nodes.items() if n["node_type"] == "PLANT"]
        dcs = [nid for nid, n in nodes.items() if n["node_type"] == "DC"]

        raw_components = [pid for pid, p in products.items() if p["product_type"] == "RAW_COMPONENT"]
        finished_goods = [pid for pid, p in products.items() if p["product_type"] == "FINISHED_GOOD"]

        # Map BOM: fg -> {comp: qty}
        bom_map = {}
        for b in boms:
            parent = b["parent_product_id"]
            comp = b["component_product_id"]
            qty = int(b["quantity_required"])
            if parent not in bom_map:
                bom_map[parent] = {}
            bom_map[parent][comp] = qty

        # Disrupted suppliers per day
        disrupted_suppliers_by_day = {t: set() for t in range(1, self.horizon_days + 1)}
        for dis in disruptions:
            if dis.get("prevents_new_shipments", True):
                s_id = dis.get("target_node_id")
                s_day = dis.get("start_day", 1)
                e_day = dis.get("end_day", 7)
                for t in range(max(1, s_day), min(self.horizon_days, e_day) + 1):
                    disrupted_suppliers_by_day[t].add(s_id)

        # Supplier capabilities lookup: (supplier, prod) -> cap dict
        supplier_cap_map = {}
        for c in capabilities:
            supplier_cap_map[(c["supplier_id"], c["product_id"])] = c

        # Lanes lookup
        supp_to_plant_lanes = []
        plant_to_dc_lanes = []
        for l in lanes:
            if l["origin_node_id"] in suppliers and l["destination_node_id"] in plants:
                supp_to_plant_lanes.append(l)
            elif l["origin_node_id"] in plants and l["destination_node_id"] in dcs:
                plant_to_dc_lanes.append(l)

        # Inbound confirmed shipments lookup: (dest, prod, arrival_day) -> sum qty
        inbound_confirmed_map = {}
        for cs in confirmed_shipments:
            key = (cs["destination_node_id"], cs["product_id"], cs["arrival_day"])
            inbound_confirmed_map[key] = inbound_confirmed_map.get(key, 0) + int(cs["quantity"])

        # Demand lookup: (dc, prod, day) -> qty
        demand_map = {}
        for d in demands:
            key = (d["node_id"], d["product_id"], d["day"])
            demand_map[key] = int(d["quantity"])

        # Initial inventory lookup: (node, prod) -> available on_hand - reserved
        initial_inv_map = {}
        for inv in initial_inv:
            avail = max(0, int(inv["on_hand"] - inv.get("reserved", 0)))
            initial_inv_map[(inv["node_id"], inv["product_id"])] = avail

        # DECISION VARIABLES
        # 1. Procurement from suppliers to plants on lanes
        # normal orders: order_var[(lane_id, prod_id, t)]
        # expedited orders: exp_order_var[(lane_id, prod_id, t)]
        order_var = {}
        exp_order_var = {}
        for l in supp_to_plant_lanes:
            s_id = l["origin_node_id"]
            for comp in raw_components:
                if (s_id, comp) in supplier_cap_map:
                    for t in range(1, self.horizon_days + 1):
                        order_var[(l["id"], comp, t)] = model.NewIntVar(0, int(l["daily_capacity"]), f"ord_{l['id']}_{comp}_{t}")
                        exp_order_var[(l["id"], comp, t)] = model.NewIntVar(0, int(l["daily_capacity"]), f"exp_ord_{l['id']}_{comp}_{t}")

        # 2. Plant Production: prod_var[(plant, fg, t)]
        prod_var = {}
        for p in plants:
            plant_cap = int(nodes[p]["capacity_per_day"])
            for fg in finished_goods:
                for t in range(1, self.horizon_days + 1):
                    prod_var[(p, fg, t)] = model.NewIntVar(0, plant_cap, f"prod_{p}_{fg}_{t}")

        # 3. Shipments from Plants to DCs on lanes
        ship_var = {}
        exp_ship_var = {}
        for l in plant_to_dc_lanes:
            for fg in finished_goods:
                for t in range(1, self.horizon_days + 1):
                    ship_var[(l["id"], fg, t)] = model.NewIntVar(0, int(l["daily_capacity"]), f"ship_{l['id']}_{fg}_{t}")
                    exp_ship_var[(l["id"], fg, t)] = model.NewIntVar(0, int(l["daily_capacity"]), f"exp_ship_{l['id']}_{fg}_{t}")

        # 4. State Variables: Inventory and Backorders
        inv_var = {}  # (node, prod, t)
        for nid in plants + dcs:
            for pid in products:
                for t in range(1, self.horizon_days + 1):
                    inv_var[(nid, pid, t)] = model.NewIntVar(0, 100000, f"inv_{nid}_{pid}_{t}")

        backorder_var = {}  # (dc, fg, t)
        for dc in dcs:
            for fg in finished_goods:
                for t in range(1, self.horizon_days + 1):
                    backorder_var[(dc, fg, t)] = model.NewIntVar(0, 100000, f"bo_{dc}_{fg}_{t}")

        sales_var = {}  # (dc, fg, t) fulfilled demand
        for dc in dcs:
            for fg in finished_goods:
                for t in range(1, self.horizon_days + 1):
                    d_qty = demand_map.get((dc, fg, t), 0)
                    sales_var[(dc, fg, t)] = model.NewIntVar(0, d_qty, f"sales_{dc}_{fg}_{t}")

        # CONSTRAINTS
        # Constraint 1: Supplier Disruption & Capacity
        for s_id in suppliers:
            s_cap = int(nodes[s_id]["capacity_per_day"])
            for t in range(1, self.horizon_days + 1):
                s_orders = []
                for l in supp_to_plant_lanes:
                    if l["origin_node_id"] == s_id:
                        for comp in raw_components:
                            if (l["id"], comp, t) in order_var:
                                s_orders.append(order_var[(l["id"], comp, t)])
                                s_orders.append(exp_order_var[(l["id"], comp, t)])
                if s_orders:
                    if s_id in disrupted_suppliers_by_day[t]:
                        # Disrupted: CANNOT place new orders
                        model.Add(sum(s_orders) == 0)
                    else:
                        model.Add(sum(s_orders) <= s_cap)

        # Constraint 2: Lane Capacity
        for l in supp_to_plant_lanes:
            l_cap = int(l["daily_capacity"])
            for t in range(1, self.horizon_days + 1):
                lane_orders = [
                    order_var[(l["id"], c, t)] + exp_order_var[(l["id"], c, t)]
                    for c in raw_components if (l["id"], c, t) in order_var
                ]
                if lane_orders:
                    model.Add(sum(lane_orders) <= l_cap)

        for l in plant_to_dc_lanes:
            l_cap = int(l["daily_capacity"])
            for t in range(1, self.horizon_days + 1):
                lane_ships = [
                    ship_var[(l["id"], fg, t)] + exp_ship_var[(l["id"], fg, t)]
                    for fg in finished_goods if (l["id"], fg, t) in ship_var
                ]
                if lane_ships:
                    model.Add(sum(lane_ships) <= l_cap)

        # Constraint 3: Plant Production Capacity
        for p in plants:
            p_cap = int(nodes[p]["capacity_per_day"])
            for t in range(1, self.horizon_days + 1):
                model.Add(sum(prod_var[(p, fg, t)] for fg in finished_goods) <= p_cap)

        # Constraint 4: Plant Inventory Flow Conservation
        for p in plants:
            # (a) Raw Components flow
            for comp in raw_components:
                for t in range(1, self.horizon_days + 1):
                    prev_inv = initial_inv_map.get((p, comp), 0) if t == 1 else inv_var[(p, comp, t - 1)]
                    
                    # Inbound receipts from suppliers arriving on day t
                    inbound_receipts = []
                    # Confirmed prior shipments
                    inbound_receipts.append(inbound_confirmed_map.get((p, comp, t), 0))
                    
                    # Normal supplier orders arriving at day t
                    for l in supp_to_plant_lanes:
                        if l["destination_node_id"] == p:
                            norm_lt = l["normal_lead_time_days"]
                            dispatch_t = t - norm_lt
                            if dispatch_t >= 1 and (l["id"], comp, dispatch_t) in order_var:
                                inbound_receipts.append(order_var[(l["id"], comp, dispatch_t)])
                            
                            exp_lt = l["expedited_lead_time_days"]
                            exp_dispatch_t = t - exp_lt
                            if exp_dispatch_t >= 1 and (l["id"], comp, exp_dispatch_t) in exp_order_var:
                                inbound_receipts.append(exp_order_var[(l["id"], comp, exp_dispatch_t)])

                    # Component consumption by production on day t
                    consumption = []
                    for fg in finished_goods:
                        req = bom_map.get(fg, {}).get(comp, 0)
                        if req > 0:
                            consumption.append(req * prod_var[(p, fg, t)])

                    # Conservation: inv[t] = inv[t-1] + inbound[t] - consumption[t]
                    model.Add(inv_var[(p, comp, t)] == prev_inv + sum(inbound_receipts) - sum(consumption))

            # (b) Finished Goods flow at Plant
            for fg in finished_goods:
                for t in range(1, self.horizon_days + 1):
                    prev_inv = initial_inv_map.get((p, fg), 0) if t == 1 else inv_var[(p, fg, t - 1)]
                    
                    # Production completed on day t
                    produced = prod_var[(p, fg, t)]

                    # Outbound shipments dispatched from plant to DCs on day t
                    outbound_ships = []
                    for l in plant_to_dc_lanes:
                        if l["origin_node_id"] == p:
                            outbound_ships.append(ship_var[(l["id"], fg, t)])
                            outbound_ships.append(exp_ship_var[(l["id"], fg, t)])

                    model.Add(inv_var[(p, fg, t)] == prev_inv + produced - sum(outbound_ships))

        # Constraint 5: DC Inventory & Demand / Backorder Conservation
        for dc in dcs:
            for fg in finished_goods:
                for t in range(1, self.horizon_days + 1):
                    prev_inv = initial_inv_map.get((dc, fg), 0) if t == 1 else inv_var[(dc, fg, t - 1)]
                    prev_bo = 0 if t == 1 else backorder_var[(dc, fg, t - 1)]

                    # Inbound arrivals at DC on day t
                    inbound_dc = []
                    inbound_dc.append(inbound_confirmed_map.get((dc, fg, t), 0))

                    for l in plant_to_dc_lanes:
                        if l["destination_node_id"] == dc:
                            norm_lt = l["normal_lead_time_days"]
                            dispatch_t = t - norm_lt
                            if dispatch_t >= 1 and (l["id"], fg, dispatch_t) in ship_var:
                                inbound_dc.append(ship_var[(l["id"], fg, dispatch_t)])

                            exp_lt = l["expedited_lead_time_days"]
                            exp_dispatch_t = t - exp_lt
                            if exp_dispatch_t >= 1 and (l["id"], fg, exp_dispatch_t) in exp_ship_var:
                                inbound_dc.append(exp_ship_var[(l["id"], fg, exp_dispatch_t)])

                    demand_t = demand_map.get((dc, fg, t), 0)
                    sales_t = sales_var[(dc, fg, t)]

                    # DC Inventory conservation: inv[t] = inv[t-1] + inbound[t] - sales[t]
                    model.Add(inv_var[(dc, fg, t)] == prev_inv + sum(inbound_dc) - sales_t)

                    # Backorder conservation: bo[t] = bo[t-1] + demand[t] - sales[t]
                    model.Add(backorder_var[(dc, fg, t)] == prev_bo + demand_t - sales_t)

        # OBJECTIVE FUNCTION: Minimize Total Landed Cost + Service Penalties
        # Integer scaling factor: 100 (cents)
        SCALE = 100
        cost_terms = []

        # 1. Supplier Procurement Costs
        for (l_id, comp, t), var in order_var.items():
            l = next(x for x in supp_to_plant_lanes if x["id"] == l_id)
            s_id = l["origin_node_id"]
            u_cost = supplier_cap_map[(s_id, comp)]["unit_cost"]
            freight = l["normal_cost_per_unit"]
            total_unit = int((u_cost + freight) * SCALE)
            cost_terms.append(total_unit * var)

        for (l_id, comp, t), var in exp_order_var.items():
            l = next(x for x in supp_to_plant_lanes if x["id"] == l_id)
            s_id = l["origin_node_id"]
            u_cost = supplier_cap_map[(s_id, comp)]["unit_cost"]
            freight = l["expedited_cost_per_unit"]
            # Expediting premium penalty
            total_unit = int((u_cost + freight + 10.0) * SCALE)
            cost_terms.append(total_unit * var)

        # 2. Plant Production Costs ($10 per unit produced)
        for (p, fg, t), var in prod_var.items():
            cost_terms.append(int(10.0 * SCALE) * var)

        # 3. Freight Costs to DCs
        for (l_id, fg, t), var in ship_var.items():
            l = next(x for x in plant_to_dc_lanes if x["id"] == l_id)
            cost_terms.append(int(l["normal_cost_per_unit"] * SCALE) * var)

        for (l_id, fg, t), var in exp_ship_var.items():
            l = next(x for x in plant_to_dc_lanes if x["id"] == l_id)
            cost_terms.append(int(l["expedited_cost_per_unit"] * SCALE) * var)

        # 4. Inventory Holding Costs
        for (nid, pid, t), var in inv_var.items():
            h_cost = products[pid]["unit_holding_cost_per_day"]
            cost_terms.append(int(h_cost * SCALE) * var)

        # 5. Backorder Penalties
        for (dc, fg, t), var in backorder_var.items():
            bo_penalty = products[fg]["unit_backorder_penalty_per_day"]
            cost_terms.append(int(bo_penalty * SCALE) * var)

        model.Minimize(sum(cost_terms))

        # Solve Model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = float(self.time_limit_seconds)
        solver.parameters.num_search_workers = 4
        solver_res = solver.Solve(model)
        elapsed_ms = (time.time() - start_time) * 1000.0

        status_mapping = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
            cp_model.UNKNOWN: "UNKNOWN"
        }
        solver_status = status_mapping.get(solver_res, "UNKNOWN")

        actions = []
        total_real_cost = 0.0
        total_demand_volume = sum(demand_map.values())
        total_fulfilled = 0
        total_backorders = 0

        if solver_status in ["OPTIMAL", "FEASIBLE"]:
            total_real_cost = solver.ObjectiveValue() / SCALE

            # Extract Planned Orders from Suppliers
            for (l_id, comp, t), var in order_var.items():
                qty = solver.Value(var)
                if qty > 0:
                    l = next(x for x in supp_to_plant_lanes if x["id"] == l_id)
                    s_id = l["origin_node_id"]
                    u_cost = supplier_cap_map[(s_id, comp)]["unit_cost"] + l["normal_cost_per_unit"]
                    delivery_day = t + l["normal_lead_time_days"]
                    actions.append({
                        "action_type": ActionType.PROCUREMENT,
                        "origin_node_id": s_id,
                        "destination_node_id": l["destination_node_id"],
                        "product_id": comp,
                        "quantity": float(qty),
                        "start_day": t,
                        "delivery_day": delivery_day,
                        "estimated_cost": float(qty * u_cost),
                        "rationale": f"Standard order from {s_id} for {comp} to {l['destination_node_id']}",
                        "evidence_ref": f"SUPPLIER-CAP-{s_id}-{comp}"
                    })

            for (l_id, comp, t), var in exp_order_var.items():
                qty = solver.Value(var)
                if qty > 0:
                    l = next(x for x in supp_to_plant_lanes if x["id"] == l_id)
                    s_id = l["origin_node_id"]
                    u_cost = supplier_cap_map[(s_id, comp)]["unit_cost"] + l["expedited_cost_per_unit"] + 10.0
                    delivery_day = t + l["expedited_lead_time_days"]
                    actions.append({
                        "action_type": ActionType.EXPEDITED_PROCUREMENT,
                        "origin_node_id": s_id,
                        "destination_node_id": l["destination_node_id"],
                        "product_id": comp,
                        "quantity": float(qty),
                        "start_day": t,
                        "delivery_day": delivery_day,
                        "estimated_cost": float(qty * u_cost),
                        "rationale": f"Expedited order from alternate {s_id} bypassing disruption",
                        "evidence_ref": f"EXPEDITED-LANE-{l_id}"
                    })

            # Extract Production Actions
            for (p, fg, t), var in prod_var.items():
                qty = solver.Value(var)
                if qty > 0:
                    actions.append({
                        "action_type": ActionType.PRODUCTION,
                        "origin_node_id": None,
                        "destination_node_id": p,
                        "product_id": fg,
                        "quantity": float(qty),
                        "start_day": t,
                        "delivery_day": t,
                        "estimated_cost": float(qty * 10.0),
                        "rationale": f"Assembly of {qty} units of {fg} at {p}",
                        "evidence_ref": f"PLANT-CAP-{p}"
                    })

            # Extract Shipments from Plants to DCs
            for (l_id, fg, t), var in ship_var.items():
                qty = solver.Value(var)
                if qty > 0:
                    l = next(x for x in plant_to_dc_lanes if x["id"] == l_id)
                    delivery_day = t + l["normal_lead_time_days"]
                    actions.append({
                        "action_type": ActionType.SHIPMENT,
                        "origin_node_id": l["origin_node_id"],
                        "destination_node_id": l["destination_node_id"],
                        "product_id": fg,
                        "quantity": float(qty),
                        "start_day": t,
                        "delivery_day": delivery_day,
                        "estimated_cost": float(qty * l["normal_cost_per_unit"]),
                        "rationale": f"Standard transport of {fg} to {l['destination_node_id']}",
                        "evidence_ref": f"LANE-{l_id}"
                    })

            for (l_id, fg, t), var in exp_ship_var.items():
                qty = solver.Value(var)
                if qty > 0:
                    l = next(x for x in plant_to_dc_lanes if x["id"] == l_id)
                    delivery_day = t + l["expedited_lead_time_days"]
                    actions.append({
                        "action_type": ActionType.EXPEDITED_SHIPMENT,
                        "origin_node_id": l["origin_node_id"],
                        "destination_node_id": l["destination_node_id"],
                        "product_id": fg,
                        "quantity": float(qty),
                        "start_day": t,
                        "delivery_day": delivery_day,
                        "estimated_cost": float(qty * l["expedited_cost_per_unit"]),
                        "rationale": f"Expedited transport of {fg} to avoid downstream shortage",
                        "evidence_ref": f"EXPEDITED-LANE-{l_id}"
                    })

            # Metrics
            for (dc, fg, t), var in sales_var.items():
                total_fulfilled += solver.Value(var)
            for (dc, fg, t), var in backorder_var.items():
                total_backorders += solver.Value(var)

        fill_rate = (total_fulfilled / total_demand_volume) if total_demand_volume > 0 else 1.0

        return {
            "solver_status": solver_status,
            "objective_value": round(total_real_cost, 2),
            "solver_duration_ms": round(elapsed_ms, 2),
            "actions": actions,
            "expected_fill_rate": round(fill_rate, 4),
            "expected_backorders": float(total_backorders),
            "total_demand_volume": float(total_demand_volume),
            "diagnostics": {
                "num_variables": model.Proto().variables.__len__(),
                "num_constraints": model.Proto().constraints.__len__(),
                "wall_time_seconds": solver.WallTime(),
                "branches": solver.NumBranches() if solver_status in ["OPTIMAL", "FEASIBLE"] else 0
            }
        }
