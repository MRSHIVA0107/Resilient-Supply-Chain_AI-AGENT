import { NextResponse } from "next/server";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";
import { runCoordinator, DEFAULT_MODEL } from "@/lib/agents.js";

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const preferredModel = body.model || DEFAULT_MODEL;
    const horizonDays = body.horizon_days || 14;

    const result = await runCoordinator(
      NETWORK_DATA,
      DISRUPTION_SCENARIO.disruptions,
      horizonDays,
      preferredModel
    );

    return NextResponse.json({
      success: true,
      ...result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/agents] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Agent coordination failed" },
      { status: 500 }
    );
  }
}
