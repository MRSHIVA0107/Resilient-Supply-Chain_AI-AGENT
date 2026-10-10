import { NextResponse } from "next/server";
import { runWhatIfSimulation } from "@/lib/whatif.js";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";

export async function POST(request) {
  try {
    const params = await request.json();
    const result = await runWhatIfSimulation(params, NETWORK_DATA, DISRUPTION_SCENARIO.disruptions);

    return NextResponse.json({
      success: true,
      ...result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/whatif] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "What-If simulation failed" },
      { status: 500 }
    );
  }
}
