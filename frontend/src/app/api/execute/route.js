import { NextResponse } from "next/server";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";
import { runDiscreteEventSimulation } from "@/lib/optimizer.js";

import { validatePlanExecutionGuardrails } from "@/lib/guardrails.js";

// In-memory idempotency cache
const executedKeys = new Set();

export async function POST(request) {
  try {
    const { plan, idempotency_key, approval_record, mode } = await request.json();

    if (!plan || !plan.actions) {
      return NextResponse.json(
        { success: false, error: "Invalid plan payload: actions array required" },
        { status: 400 }
      );
    }

    // 1. Tier 3 Governance Guardrails Check (SHA-256 Tamper Protection)
    const guardrailCheck = validatePlanExecutionGuardrails(
      plan,
      approval_record || (plan.status === "APPROVED" ? { status: "APPROVED", approver: "Planner" } : null),
      idempotency_key,
      plan.scenario_version || 1
    );

    // Hard block if cryptographic hash fails (tamper detection)
    if (!guardrailCheck.is_tamper_free) {
      return NextResponse.json(
        {
          success: false,
          guardrail_id: "GOV-GR-01",
          error: "EXECUTION BLOCKED BY GUARDRAIL: Plan cryptographic SHA-256 signature mismatch. The action payload has been modified post-generation.",
          violations: guardrailCheck.violations,
        },
        { status: 403 }
      );
    }

    // Idempotency verification (GOV-GR-04)
    const idKey = idempotency_key || `KEY-${plan.plan_id || "DEF"}-${plan.plan_hash || "HASH"}`;
    if (executedKeys.has(idKey)) {
      return NextResponse.json(
        {
          success: false,
          guardrail_id: "GOV-GR-04",
          error: `Idempotency violation: Plan '${plan.plan_id}' has already been dispatched with key '${idKey}'. Duplicate execution blocked.`,
        },
        { status: 409 }
      );
    }

    executedKeys.add(idKey);

    const simulationResult = runDiscreteEventSimulation(plan, NETWORK_DATA, DISRUPTION_SCENARIO.disruptions);

    return NextResponse.json({
      success: true,
      message: "Plan executed successfully in discrete-event simulation sandbox",
      details: simulationResult,
    });
  } catch (err) {
    console.error("[/api/execute] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Simulation execution failed" },
      { status: 500 }
    );
  }
}
