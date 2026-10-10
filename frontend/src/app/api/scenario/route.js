import { NextResponse } from "next/server";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";

export async function GET() {
  // Return full scenario + network data
  return NextResponse.json({
    scenario: DISRUPTION_SCENARIO,
    network: NETWORK_DATA,
    summary: {
      nodes: NETWORK_DATA.nodes.length,
      products: NETWORK_DATA.products.length,
      lanes: NETWORK_DATA.lanes.length,
      demands: NETWORK_DATA.demands.length,
      total_demand_units: NETWORK_DATA.demands.reduce((s, d) => s + d.quantity, 0),
      disruptions: DISRUPTION_SCENARIO.disruptions.length,
      horizon_days: NETWORK_DATA.metadata.horizon_days,
    },
  });
}
