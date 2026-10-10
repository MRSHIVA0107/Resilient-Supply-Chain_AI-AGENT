"""Reproducible three-echelon supply network scenario generator."""
import random
import json
import hashlib
from typing import Dict, Any, List
from app.schemas.supply_chain import (
    NodeSchema, ProductSchema, BillOfMaterialsSchema, TransportLaneSchema,
    SupplierCapabilitySchema, InventoryRecordSchema, ConfirmedInboundShipmentSchema,
    DemandRecordSchema, FullNetworkData
)
from app.models.supply_chain import NodeType, ProductType, PriorityLevel
from app.models.scenario import DisruptionType


def generate_demonstration_network(
    scenario_id: str = "SCENARIO-DEMO-01",
    seed: int = 42,
    horizon_days: int = 14,
    supplier_outage_days: int = 7
) -> Dict[str, Any]:
    """
    Generates a reproducible, industrial 3-echelon supply chain dataset:
    - Echelon 1: Suppliers (S1: Primary Critical, S2: Alternate Standard, S3: Expedited Supplier)
    - Echelon 2: Manufacturing Plants (Plant-1: Central, Plant-2: Regional)
    - Echelon 3: Distribution Centers (DC-North, DC-South, DC-West)
    - Components: COMP-A (Critical), COMP-B (Standard)
    - Finished Products: PROD-1 (uses 1 COMP-A + 1 COMP-B), PROD-2 (uses 1 COMP-B)
    """
    rng = random.Random(seed)

    # 1. Nodes
    nodes = [
        # Suppliers
        NodeSchema(id="S1", name="Apex Semiconductor (Critical Supplier)", node_type=NodeType.SUPPLIER, location="Hsinchu, Taiwan", capacity_per_day=450.0, holding_cost_multiplier=1.0),
        NodeSchema(id="S2", name="Pacific Silicon (Approved Alternate)", node_type=NodeType.SUPPLIER, location="Kyoto, Japan", capacity_per_day=350.0, holding_cost_multiplier=1.0),
        NodeSchema(id="S3", name="EuroTech Electronics (Expedited Sourcing)", node_type=NodeType.SUPPLIER, location="Dresden, Germany", capacity_per_day=300.0, holding_cost_multiplier=1.2),
        
        # Plants
        NodeSchema(id="Plant-1", name="Austin Assembly Plant", node_type=NodeType.PLANT, location="Austin, TX, USA", capacity_per_day=600.0, holding_cost_multiplier=1.0),
        NodeSchema(id="Plant-2", name="Reno Regional Plant", node_type=NodeType.PLANT, location="Reno, NV, USA", capacity_per_day=300.0, holding_cost_multiplier=1.1),
        
        # DCs
        NodeSchema(id="DC-North", name="Chicago Distribution Center", node_type=NodeType.DC, location="Chicago, IL, USA", capacity_per_day=1000.0, holding_cost_multiplier=0.9),
        NodeSchema(id="DC-South", name="Dallas Distribution Center", node_type=NodeType.DC, location="Dallas, TX, USA", capacity_per_day=800.0, holding_cost_multiplier=0.9),
        NodeSchema(id="DC-West", name="Los Angeles Distribution Center", node_type=NodeType.DC, location="Ontario, CA, USA", capacity_per_day=900.0, holding_cost_multiplier=1.0),
    ]

    # 2. Products
    products = [
        ProductSchema(id="COMP-A", name="Microcontroller SoC (Critical)", product_type=ProductType.RAW_COMPONENT, unit_holding_cost_per_day=0.30, unit_backorder_penalty_per_day=35.0),
        ProductSchema(id="COMP-B", name="Passive Component Pack", product_type=ProductType.RAW_COMPONENT, unit_holding_cost_per_day=0.10, unit_backorder_penalty_per_day=15.0),
        ProductSchema(id="PROD-1", name="Enterprise Gateway Hub (Tier-1)", product_type=ProductType.FINISHED_GOOD, unit_holding_cost_per_day=1.50, unit_backorder_penalty_per_day=120.0),
        ProductSchema(id="PROD-2", name="Standard IoT Node", product_type=ProductType.FINISHED_GOOD, unit_holding_cost_per_day=0.80, unit_backorder_penalty_per_day=60.0),
    ]

    # 3. Bill of Materials
    boms = [
        BillOfMaterialsSchema(id="BOM-1", parent_product_id="PROD-1", component_product_id="COMP-A", quantity_required=1.0),
        BillOfMaterialsSchema(id="BOM-2", parent_product_id="PROD-1", component_product_id="COMP-B", quantity_required=1.0),
        BillOfMaterialsSchema(id="BOM-3", parent_product_id="PROD-2", component_product_id="COMP-B", quantity_required=1.0),
    ]

    # 4. Transport Lanes
    lanes = [
        # Supplier -> Plant
        TransportLaneSchema(id="L-S1-P1", origin_node_id="S1", destination_node_id="Plant-1", normal_lead_time_days=3, normal_cost_per_unit=12.0, expedited_lead_time_days=1, expedited_cost_per_unit=40.0, daily_capacity=400.0),
        TransportLaneSchema(id="L-S2-P1", origin_node_id="S2", destination_node_id="Plant-1", normal_lead_time_days=2, normal_cost_per_unit=16.0, expedited_lead_time_days=1, expedited_cost_per_unit=45.0, daily_capacity=350.0),
        TransportLaneSchema(id="L-S3-P1", origin_node_id="S3", destination_node_id="Plant-1", normal_lead_time_days=3, normal_cost_per_unit=22.0, expedited_lead_time_days=1, expedited_cost_per_unit=55.0, daily_capacity=300.0),
        TransportLaneSchema(id="L-S2-P2", origin_node_id="S2", destination_node_id="Plant-2", normal_lead_time_days=2, normal_cost_per_unit=18.0, expedited_lead_time_days=1, expedited_cost_per_unit=48.0, daily_capacity=200.0),

        # Plant -> DC
        TransportLaneSchema(id="L-P1-DCN", origin_node_id="Plant-1", destination_node_id="DC-North", normal_lead_time_days=1, normal_cost_per_unit=6.0, expedited_lead_time_days=1, expedited_cost_per_unit=18.0, daily_capacity=350.0),
        TransportLaneSchema(id="L-P1-DCS", origin_node_id="Plant-1", destination_node_id="DC-South", normal_lead_time_days=1, normal_cost_per_unit=4.0, expedited_lead_time_days=1, expedited_cost_per_unit=14.0, daily_capacity=350.0),
        TransportLaneSchema(id="L-P1-DCW", origin_node_id="Plant-1", destination_node_id="DC-West", normal_lead_time_days=2, normal_cost_per_unit=9.0, expedited_lead_time_days=1, expedited_cost_per_unit=24.0, daily_capacity=250.0),
        TransportLaneSchema(id="L-P2-DCW", origin_node_id="Plant-2", destination_node_id="DC-West", normal_lead_time_days=1, normal_cost_per_unit=5.0, expedited_lead_time_days=1, expedited_cost_per_unit=15.0, daily_capacity=200.0),
        TransportLaneSchema(id="L-P2-DCS", origin_node_id="Plant-2", destination_node_id="DC-South", normal_lead_time_days=2, normal_cost_per_unit=8.0, expedited_lead_time_days=1, expedited_cost_per_unit=22.0, daily_capacity=150.0),
    ]

    # 5. Supplier Item Capabilities
    supplier_capabilities = [
        # S1 supplies COMP-A (primary) and COMP-B
        SupplierCapabilitySchema(id="CAP-S1-A", supplier_id="S1", product_id="COMP-A", unit_cost=25.0, min_order_quantity=50.0, max_daily_capacity=350.0, lead_time_days=3, is_qualified=True),
        SupplierCapabilitySchema(id="CAP-S1-B", supplier_id="S1", product_id="COMP-B", unit_cost=5.0, min_order_quantity=50.0, max_daily_capacity=400.0, lead_time_days=3, is_qualified=True),
        
        # S2 is approved alternate for COMP-A and supplier for COMP-B
        SupplierCapabilitySchema(id="CAP-S2-A", supplier_id="S2", product_id="COMP-A", unit_cost=32.0, min_order_quantity=30.0, max_daily_capacity=220.0, lead_time_days=2, is_qualified=True),
        SupplierCapabilitySchema(id="CAP-S2-B", supplier_id="S2", product_id="COMP-B", unit_cost=6.5, min_order_quantity=50.0, max_daily_capacity=350.0, lead_time_days=2, is_qualified=True),

        # S3 is premium expedited alternate for COMP-A
        SupplierCapabilitySchema(id="CAP-S3-A", supplier_id="S3", product_id="COMP-A", unit_cost=42.0, min_order_quantity=20.0, max_daily_capacity=200.0, lead_time_days=2, is_qualified=True),
    ]

    # 6. Initial Inventory (Day 1 start)
    # Balanced starting stock: Plant-1 has ~3 days of COMP-A buffer, creating exposure around Day 4 if S1 halts.
    initial_inventory = [
        # Plant-1 Components
        InventoryRecordSchema(id="INV-P1-A", scenario_id=scenario_id, node_id="Plant-1", product_id="COMP-A", day=1, on_hand=320.0, reserved=40.0, safety_stock=80.0),
        InventoryRecordSchema(id="INV-P1-B", scenario_id=scenario_id, node_id="Plant-1", product_id="COMP-B", day=1, on_hand=800.0, reserved=60.0, safety_stock=100.0),
        InventoryRecordSchema(id="INV-P1-P1", scenario_id=scenario_id, node_id="Plant-1", product_id="PROD-1", day=1, on_hand=150.0, reserved=50.0, safety_stock=40.0),
        InventoryRecordSchema(id="INV-P1-P2", scenario_id=scenario_id, node_id="Plant-1", product_id="PROD-2", day=1, on_hand=200.0, reserved=40.0, safety_stock=40.0),

        # Plant-2 Components
        InventoryRecordSchema(id="INV-P2-A", scenario_id=scenario_id, node_id="Plant-2", product_id="COMP-A", day=1, on_hand=90.0, reserved=10.0, safety_stock=30.0),
        InventoryRecordSchema(id="INV-P2-B", scenario_id=scenario_id, node_id="Plant-2", product_id="COMP-B", day=1, on_hand=400.0, reserved=20.0, safety_stock=50.0),
        InventoryRecordSchema(id="INV-P2-P1", scenario_id=scenario_id, node_id="Plant-2", product_id="PROD-1", day=1, on_hand=60.0, reserved=20.0, safety_stock=20.0),
        InventoryRecordSchema(id="INV-P2-P2", scenario_id=scenario_id, node_id="Plant-2", product_id="PROD-2", day=1, on_hand=100.0, reserved=20.0, safety_stock=20.0),

        # Distribution Centers Finished Goods
        InventoryRecordSchema(id="INV-DCN-P1", scenario_id=scenario_id, node_id="DC-North", product_id="PROD-1", day=1, on_hand=140.0, reserved=30.0, safety_stock=50.0),
        InventoryRecordSchema(id="INV-DCN-P2", scenario_id=scenario_id, node_id="DC-North", product_id="PROD-2", day=1, on_hand=180.0, reserved=30.0, safety_stock=40.0),

        InventoryRecordSchema(id="INV-DCS-P1", scenario_id=scenario_id, node_id="DC-South", product_id="PROD-1", day=1, on_hand=120.0, reserved=20.0, safety_stock=40.0),
        InventoryRecordSchema(id="INV-DCS-P2", scenario_id=scenario_id, node_id="DC-South", product_id="PROD-2", day=1, on_hand=150.0, reserved=20.0, safety_stock=30.0),

        InventoryRecordSchema(id="INV-DCW-P1", scenario_id=scenario_id, node_id="DC-West", product_id="PROD-1", day=1, on_hand=110.0, reserved=20.0, safety_stock=40.0),
        InventoryRecordSchema(id="INV-DCW-P2", scenario_id=scenario_id, node_id="DC-West", product_id="PROD-2", day=1, on_hand=130.0, reserved=20.0, safety_stock=30.0),
    ]

    # 7. Confirmed Inbound Shipments (dispatched prior to day 1, arriving in Days 1-3)
    confirmed_inbound_shipments = [
        ConfirmedInboundShipmentSchema(
            id="SHIP-INB-01",
            scenario_id=scenario_id,
            origin_node_id="S1",
            destination_node_id="Plant-1",
            product_id="COMP-A",
            quantity=150.0,
            dispatch_day=0,
            arrival_day=2,
            is_expedited=False
        ),
        ConfirmedInboundShipmentSchema(
            id="SHIP-INB-02",
            scenario_id=scenario_id,
            origin_node_id="S1",
            destination_node_id="Plant-1",
            product_id="COMP-B",
            quantity=200.0,
            dispatch_day=0,
            arrival_day=1,
            is_expedited=False
        ),
    ]

    # 8. Demand Series across 14-day horizon
    demands = []
    demand_id_counter = 1
    for day in range(1, horizon_days + 1):
        # Weekly seasonality / random variance around baseline
        factor = 1.2 if (day % 7) in [4, 5] else 1.0  # Slight weekend/peak variation
        
        # DC-North Demands
        d_p1_dcn = round(rng.uniform(70, 95) * factor)
        d_p2_dcn = round(rng.uniform(50, 75) * factor)
        demands.append(DemandRecordSchema(id=f"DEM-{demand_id_counter:04d}", scenario_id=scenario_id, node_id="DC-North", product_id="PROD-1", day=day, quantity=d_p1_dcn, priority=PriorityLevel.HIGH if day <= 7 else PriorityLevel.NORMAL))
        demand_id_counter += 1
        demands.append(DemandRecordSchema(id=f"DEM-{demand_id_counter:04d}", scenario_id=scenario_id, node_id="DC-North", product_id="PROD-2", day=day, quantity=d_p2_dcn, priority=PriorityLevel.NORMAL))
        demand_id_counter += 1

        # DC-South Demands
        d_p1_dcs = round(rng.uniform(55, 80) * factor)
        d_p2_dcs = round(rng.uniform(40, 60) * factor)
        demands.append(DemandRecordSchema(id=f"DEM-{demand_id_counter:04d}", scenario_id=scenario_id, node_id="DC-South", product_id="PROD-1", day=day, quantity=d_p1_dcs, priority=PriorityLevel.HIGH if day <= 7 else PriorityLevel.NORMAL))
        demand_id_counter += 1
        demands.append(DemandRecordSchema(id=f"DEM-{demand_id_counter:04d}", scenario_id=scenario_id, node_id="DC-South", product_id="PROD-2", day=day, quantity=d_p2_dcs, priority=PriorityLevel.NORMAL))
        demand_id_counter += 1

        # DC-West Demands
        d_p1_dcw = round(rng.uniform(50, 70) * factor)
        d_p2_dcw = round(rng.uniform(35, 55) * factor)
        demands.append(DemandRecordSchema(id=f"DEM-{demand_id_counter:04d}", scenario_id=scenario_id, node_id="DC-West", product_id="PROD-1", day=day, quantity=d_p1_dcw, priority=PriorityLevel.HIGH if day <= 7 else PriorityLevel.NORMAL))
        demand_id_counter += 1
        demands.append(DemandRecordSchema(id=f"DEM-{demand_id_counter:04d}", scenario_id=scenario_id, node_id="DC-West", product_id="PROD-2", day=day, quantity=d_p2_dcw, priority=PriorityLevel.NORMAL))
        demand_id_counter += 1

    # 9. Disruption Configuration: 7-day complete supplier shutdown of S1
    disruptions = [
        {
            "id": f"DISRUPT-{scenario_id}-S1",
            "scenario_id": scenario_id,
            "target_node_id": "S1",
            "disruption_type": DisruptionType.SUPPLIER_SHUTDOWN.value,
            "start_day": 1,
            "end_day": supplier_outage_days,
            "severity": 1.0,  # 100% capacity loss
            "prevents_new_shipments": True,
            "prevents_in_transit_receipts": False,  # confirmed in-transit shipments can still be received
        }
    ]

    full_network = FullNetworkData(
        nodes=nodes,
        products=products,
        boms=boms,
        lanes=lanes,
        supplier_capabilities=supplier_capabilities,
        initial_inventory=initial_inventory,
        confirmed_inbound_shipments=confirmed_inbound_shipments,
        demands=demands
    )

    # Compute deterministic snapshot hash
    serialized_payload = json.dumps(full_network.dict(), sort_keys=True)
    snapshot_hash = hashlib.sha256(serialized_payload.encode("utf-8")).hexdigest()

    return {
        "scenario_id": scenario_id,
        "name": "Seven-Day Critical Supplier Shutdown (Baseline Scenario)",
        "description": "Apex Semiconductor (S1) undergoes 7-day shutdown (Day 1-7). Testing multi-echelon recovery via alternate suppliers (S2, S3), plant flexibility, and expedited transport.",
        "seed": seed,
        "horizon_days": horizon_days,
        "disruptions": disruptions,
        "network_data": full_network.dict(),
        "snapshot_hash": snapshot_hash
    }
