import { NextResponse } from "next/server";
import {
  getGuardrailSystemStatus,
  checkPromptGuardrail,
  simulateGuardrailTest,
  validateSupplyChainActionGuardrails,
  validatePlanExecutionGuardrails,
} from "@/lib/guardrails.js";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";

export async function GET() {
  try {
    const status = getGuardrailSystemStatus();
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err) {
    console.error("[/api/guardrails GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve guardrail status" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || "status";

    if (action === "test_prompt") {
      const result = checkPromptGuardrail(body.prompt || "");
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "simulate") {
      const result = simulateGuardrailTest(body.guardrail_id || "PHYS-GR-01");
      return NextResponse.json({ success: true, guardrail_id: body.guardrail_id, ...result });
    }

    if (action === "validate_actions") {
      const result = validateSupplyChainActionGuardrails(body.actions || [], NETWORK_DATA, DISRUPTION_SCENARIO.disruptions);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "audit_plan") {
      const result = validatePlanExecutionGuardrails(
        body.plan,
        body.approval_record,
        body.idempotency_key,
        body.scenario_version || 1
      );
      return NextResponse.json({ success: true, ...result });
    }

    const status = getGuardrailSystemStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    console.error("[/api/guardrails POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Guardrail evaluation failed" },
      { status: 500 }
    );
  }
}
