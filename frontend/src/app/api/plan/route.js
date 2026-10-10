import { NextResponse } from "next/server";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";
import { runOptimizationSolver } from "@/lib/optimizer.js";
import { evaluatePlan } from "@/lib/evaluation.js";
import crypto from "crypto";

import { validateSupplyChainActionGuardrails } from "@/lib/guardrails.js";

export async function POST() {
  try {
    const solverResult = runOptimizationSolver(NETWORK_DATA, DISRUPTION_SCENARIO.disruptions);
    const evaluation = evaluatePlan(solverResult, NETWORK_DATA, DISRUPTION_SCENARIO.disruptions, "OPTIMIZER");
    const guardrails = validateSupplyChainActionGuardrails(solverResult.actions, NETWORK_DATA, DISRUPTION_SCENARIO.disruptions);

    const planId = `PLAN-JS-${Date.now().toString(36).toUpperCase()}`;
    const planContent = JSON.stringify({ actions: solverResult.actions, cost: solverResult.objective_value }, null);
    const planHash = crypto.createHash("sha256").update(planContent).digest("hex");

    return NextResponse.json({
      success: true,
      plan_id: planId,
      plan_hash: planHash,
      version: 1,
      status: !guardrails.passed || evaluation.grading.grade === "F" ? "FAILED" : "VALIDATED",
      approach: "OPTIMIZER",
      solver_status: solverResult.solver_status,
      total_cost: solverResult.objective_value,
      expected_fill_rate: solverResult.expected_fill_rate,
      expected_backorders: solverResult.expected_backorders,
      solver_duration_ms: solverResult.solver_duration_ms,
      actions: solverResult.actions,
      evaluation,
      guardrail_scorecard: {
        passed: guardrails.passed,
        violations_count: guardrails.violations_count,
        violations: guardrails.violations,
        framework: "HITAM Multi-Tier Safety Guardrails",
      },
      trade_off_summary: solverResult.trade_off_summary,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/plan] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Plan generation failed" },
      { status: 500 }
    );
  }
}
