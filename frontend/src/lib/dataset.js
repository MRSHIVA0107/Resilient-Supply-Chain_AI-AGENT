/**
 * Resilient Supply Chain — Reproducible Network Dataset (Deliverable 1)
 * 3-Echelon: Suppliers (S1/S2/S3) → Plants (Plant-1/Plant-2) → DCs (DC-North/DC-South/DC-West)
 * Disruption: Apex Semiconductor (S1) shutdown Days 1–7
 */

export const NETWORK_DATA = {
  metadata: {
    dataset_version: "v2.0.0",
    scenario_name: "Apex-S1-7Day-Shutdown",
    horizon_days: 14,
    currency: "USD",
    created_at: "2025-01-01T00:00:00Z",
  },

  nodes: [
    { id: "S1", name: "Apex Semiconductor", type: "SUPPLIER", tier: 1, location: "Austin, TX", country: "USA", region: "North America", reliability_score: 0.97, risk_category: "CRITICAL" },
    { id: "S2", name: "Pacific Silicon", type: "SUPPLIER", tier: 1, location: "San Jose, CA", country: "USA", region: "North America", reliability_score: 0.93, risk_category: "MEDIUM" },
    { id: "S3", name: "EuroTech Components", type: "SUPPLIER", tier: 1, location: "Munich, DE", country: "Germany", region: "Europe", reliability_score: 0.91, risk_category: "LOW" },
    { id: "Plant-1", name: "Austin Assembly Plant", type: "PLANT", tier: 2, location: "Austin, TX", country: "USA", region: "North America", daily_capacity_units: 350, reliability_score: 0.99, risk_category: "LOW" },
    { id: "Plant-2", name: "Phoenix Assembly Plant", type: "PLANT", tier: 2, location: "Phoenix, AZ", country: "USA", region: "North America", daily_capacity_units: 200, reliability_score: 0.98, risk_category: "LOW" },
    { id: "DC-North", name: "Northern DC", type: "DC", tier: 3, location: "Chicago, IL", country: "USA", region: "North America", max_throughput_per_day: 500, reliability_score: 0.99, risk_category: "LOW" },
    { id: "DC-South", name: "Southern DC", type: "DC", tier: 3, location: "Dallas, TX", country: "USA", region: "North America", max_throughput_per_day: 400, reliability_score: 0.99, risk_category: "LOW" },
    { id: "DC-West", name: "Western DC", type: "DC", tier: 3, location: "Los Angeles, CA", country: "USA", region: "North America", max_throughput_per_day: 450, reliability_score: 0.99, risk_category: "LOW" },
  ],

  products: [
    { id: "COMP-A", name: "Critical Semiconductor Component A", type: "COMPONENT", unit_cost: 25.0, unit_backorder_penalty_per_day: 15.0, weight_kg: 0.05, is_critical: true },
    { id: "COMP-B", name: "Standard Electronic Component B", type: "COMPONENT", unit_cost: 12.0, unit_backorder_penalty_per_day: 8.0, weight_kg: 0.08, is_critical: false },
    { id: "PROD-1", name: "Flagship Product (A+B required)", type: "FINISHED_GOOD", unit_cost: 180.0, unit_backorder_penalty_per_day: 45.0, weight_kg: 0.5, is_critical: true },
    { id: "PROD-2", name: "Standard Product (B only)", type: "FINISHED_GOOD", unit_cost: 120.0, unit_backorder_penalty_per_day: 25.0, weight_kg: 0.4, is_critical: false },
  ],

  boms: [
    { product_id: "PROD-1", component_id: "COMP-A", quantity_per_unit: 1.0 },
    { product_id: "PROD-1", component_id: "COMP-B", quantity_per_unit: 1.0 },
    { product_id: "PROD-2", component_id: "COMP-B", quantity_per_unit: 1.0 },
  ],

  lanes: [
    { id: "LANE-S1-P1", origin_node_id: "S1", destination_node_id: "Plant-1", mode: "ROAD", normal_lead_time_days: 1, expedited_lead_time_days: 1, normal_cost_per_unit: 2.0, expedited_cost_per_unit: 5.5, max_capacity_per_shipment: 500 },
    { id: "LANE-S1-P2", origin_node_id: "S1", destination_node_id: "Plant-2", mode: "ROAD", normal_lead_time_days: 2, expedited_lead_time_days: 1, normal_cost_per_unit: 3.0, expedited_cost_per_unit: 7.0, max_capacity_per_shipment: 300 },
    { id: "LANE-S2-P1", origin_node_id: "S2", destination_node_id: "Plant-1", mode: "ROAD", normal_lead_time_days: 2, expedited_lead_time_days: 1, normal_cost_per_unit: 3.5, expedited_cost_per_unit: 8.0, max_capacity_per_shipment: 400 },
    { id: "LANE-S2-P2", origin_node_id: "S2", destination_node_id: "Plant-2", mode: "AIR", normal_lead_time_days: 3, expedited_lead_time_days: 2, normal_cost_per_unit: 5.0, expedited_cost_per_unit: 10.0, max_capacity_per_shipment: 250 },
    { id: "LANE-S3-P1", origin_node_id: "S3", destination_node_id: "Plant-1", mode: "AIR", normal_lead_time_days: 4, expedited_lead_time_days: 2, normal_cost_per_unit: 8.0, expedited_cost_per_unit: 18.0, max_capacity_per_shipment: 200 },
    { id: "LANE-S3-P2", origin_node_id: "S3", destination_node_id: "Plant-2", mode: "AIR", normal_lead_time_days: 5, expedited_lead_time_days: 3, normal_cost_per_unit: 10.0, expedited_cost_per_unit: 20.0, max_capacity_per_shipment: 150 },
    { id: "LANE-P1-DCN", origin_node_id: "Plant-1", destination_node_id: "DC-North", mode: "ROAD", normal_lead_time_days: 2, expedited_lead_time_days: 1, normal_cost_per_unit: 4.0, expedited_cost_per_unit: 9.0, max_capacity_per_shipment: 400 },
    { id: "LANE-P1-DCS", origin_node_id: "Plant-1", destination_node_id: "DC-South", mode: "ROAD", normal_lead_time_days: 1, expedited_lead_time_days: 1, normal_cost_per_unit: 2.5, expedited_cost_per_unit: 6.0, max_capacity_per_shipment: 350 },
    { id: "LANE-P1-DCW", origin_node_id: "Plant-1", destination_node_id: "DC-West", mode: "ROAD", normal_lead_time_days: 3, expedited_lead_time_days: 2, normal_cost_per_unit: 5.5, expedited_cost_per_unit: 12.0, max_capacity_per_shipment: 300 },
    { id: "LANE-P2-DCN", origin_node_id: "Plant-2", destination_node_id: "DC-North", mode: "ROAD", normal_lead_time_days: 3, expedited_lead_time_days: 2, normal_cost_per_unit: 5.0, expedited_cost_per_unit: 11.0, max_capacity_per_shipment: 250 },
    { id: "LANE-P2-DCS", origin_node_id: "Plant-2", destination_node_id: "DC-South", mode: "ROAD", normal_lead_time_days: 2, expedited_lead_time_days: 1, normal_cost_per_unit: 3.5, expedited_cost_per_unit: 8.0, max_capacity_per_shipment: 300 },
    { id: "LANE-P2-DCW", origin_node_id: "Plant-2", destination_node_id: "DC-West", mode: "ROAD", normal_lead_time_days: 1, expedited_lead_time_days: 1, normal_cost_per_unit: 2.0, expedited_cost_per_unit: 5.0, max_capacity_per_shipment: 350 },
  ],

  supplier_capabilities: [
    { supplier_id: "S1", product_id: "COMP-A", is_qualified: true, unit_cost: 25.0, max_daily_capacity: 400, lead_time_days: 1, min_order_quantity: 50, contract_type: "PRIMARY" },
    { supplier_id: "S1", product_id: "COMP-B", is_qualified: true, unit_cost: 12.0, max_daily_capacity: 500, lead_time_days: 1, min_order_quantity: 50, contract_type: "PRIMARY" },
    { supplier_id: "S2", product_id: "COMP-A", is_qualified: true, unit_cost: 28.0, max_daily_capacity: 350, lead_time_days: 2, min_order_quantity: 50, contract_type: "ALTERNATE" },
    { supplier_id: "S2", product_id: "COMP-B", is_qualified: true, unit_cost: 14.0, max_daily_capacity: 400, lead_time_days: 2, min_order_quantity: 50, contract_type: "ALTERNATE" },
    { supplier_id: "S3", product_id: "COMP-A", is_qualified: true, unit_cost: 32.0, max_daily_capacity: 200, lead_time_days: 4, min_order_quantity: 100, contract_type: "SPOT" },
    { supplier_id: "S3", product_id: "COMP-B", is_qualified: false, unit_cost: 15.0, max_daily_capacity: 150, lead_time_days: 5, min_order_quantity: 100, contract_type: "SPOT" },
  ],

  initial_inventory: [
    { node_id: "S2", product_id: "COMP-A", on_hand: 500, reserved: 0, safety_stock: 100, reorder_point: 200 },
    { node_id: "S3", product_id: "COMP-A", on_hand: 300, reserved: 50, safety_stock: 80, reorder_point: 150 },
    { node_id: "Plant-1", product_id: "COMP-A", on_hand: 420, reserved: 0, safety_stock: 120, reorder_point: 240 },
    { node_id: "Plant-1", product_id: "COMP-B", on_hand: 650, reserved: 0, safety_stock: 150, reorder_point: 300 },
    { node_id: "Plant-1", product_id: "PROD-1", on_hand: 180, reserved: 0, safety_stock: 60, reorder_point: 120 },
    { node_id: "Plant-1", product_id: "PROD-2", on_hand: 200, reserved: 0, safety_stock: 50, reorder_point: 100 },
    { node_id: "Plant-2", product_id: "COMP-A", on_hand: 280, reserved: 0, safety_stock: 80, reorder_point: 160 },
    { node_id: "Plant-2", product_id: "COMP-B", on_hand: 450, reserved: 0, safety_stock: 100, reorder_point: 200 },
    { node_id: "Plant-2", product_id: "PROD-1", on_hand: 100, reserved: 0, safety_stock: 40, reorder_point: 80 },
    { node_id: "Plant-2", product_id: "PROD-2", on_hand: 150, reserved: 0, safety_stock: 40, reorder_point: 80 },
    { node_id: "DC-North", product_id: "PROD-1", on_hand: 280, reserved: 20, safety_stock: 80, reorder_point: 160 },
    { node_id: "DC-North", product_id: "PROD-2", on_hand: 350, reserved: 0, safety_stock: 80, reorder_point: 160 },
    { node_id: "DC-South", product_id: "PROD-1", on_hand: 240, reserved: 10, safety_stock: 70, reorder_point: 140 },
    { node_id: "DC-South", product_id: "PROD-2", on_hand: 300, reserved: 0, safety_stock: 70, reorder_point: 140 },
    { node_id: "DC-West", product_id: "PROD-1", on_hand: 190, reserved: 15, safety_stock: 60, reorder_point: 120 },
    { node_id: "DC-West", product_id: "PROD-2", on_hand: 260, reserved: 0, safety_stock: 60, reorder_point: 120 },
  ],

  confirmed_inbound_shipments: [
    { id: "CS-001", origin_node_id: "S1", destination_node_id: "Plant-1", product_id: "COMP-A", quantity: 200, departure_day: 0, arrival_day: 1, cost: 400.0 },
    { id: "CS-002", origin_node_id: "S1", destination_node_id: "Plant-1", product_id: "COMP-B", quantity: 300, departure_day: 0, arrival_day: 1, cost: 600.0 },
    { id: "CS-003", origin_node_id: "S2", destination_node_id: "Plant-1", product_id: "COMP-A", quantity: 150, departure_day: -1, arrival_day: 2, cost: 525.0 },
  ],

  demands: (() => {
    const demands = [];
    const dcDemand = {
      "DC-North": { "PROD-1": 55, "PROD-2": 40 },
      "DC-South": { "PROD-1": 45, "PROD-2": 35 },
      "DC-West": { "PROD-1": 35, "PROD-2": 28 },
    };
    let id = 1;
    for (let day = 1; day <= 14; day++) {
      for (const [dcId, prods] of Object.entries(dcDemand)) {
        for (const [prodId, baseQty] of Object.entries(prods)) {
          const variation = 0.92 + (Math.sin(day * 0.7 + id * 0.3) * 0.08);
          const qty = Math.round(baseQty * variation);
          const priority = (day <= 7 && prodId === "PROD-1") ? "HIGH" : "NORMAL";
          demands.push({ id: `DEM-${String(id).padStart(4, "0")}`, node_id: dcId, product_id: prodId, day, quantity: qty, priority });
          id++;
        }
      }
    }
    return demands;
  })(),

  cost_assumptions: {
    holding_cost_per_unit_per_day: 0.50,
    expedite_premium_multiplier: 2.5,
    backorder_penalty_per_unit_per_day: { "PROD-1": 45.0, "PROD-2": 25.0 },
  },
};

export const DISRUPTION_SCENARIO = {
  id: "DISRUPT-APEX-S1-001",
  name: "Apex Semiconductor 7-Day Shutdown",
  description: "Critical primary supplier S1 (Apex Semiconductor) experiences complete operational shutdown due to equipment failure. All new purchase orders blocked Days 1–7.",
  disruptions: [
    {
      id: "DIS-001",
      target_node_id: "S1",
      disruption_type: "SUPPLIER_SHUTDOWN",
      severity: 1.0,
      start_day: 1,
      end_day: 7,
      prevents_new_shipments: true,
      estimated_recovery_day: 8,
      description: "Complete shutdown of Apex Semiconductor S1. Zero new purchase orders accepted.",
      financial_exposure_usd: 485000,
    },
  ],
  affected_products: ["COMP-A", "COMP-B", "PROD-1", "PROD-2"],
  network_exposure_percent: 0.68,
};
