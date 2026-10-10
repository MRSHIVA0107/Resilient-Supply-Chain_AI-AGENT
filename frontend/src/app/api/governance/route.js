import { NextResponse } from "next/server";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";
import { analyzeNetworkFailureModes, verifyPlanGovernance } from "@/lib/governance.js";

export async function GET() {
  try {
    const failureAnalysis = analyzeNetworkFailureModes(NETWORK_DATA, DISRUPTION_SCENARIO.disruptions);

    return NextResponse.json({
      success: true,
      ...failureAnalysis,
    });
  } catch (err) {
    console.error("[/api/governance] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Governance analysis failed" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { plan, approval_record } = await request.json();
    const result = verifyPlanGovernance(plan, approval_record);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[/api/governance POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Plan governance verification failed" },
      { status: 500 }
    );
  }
}
