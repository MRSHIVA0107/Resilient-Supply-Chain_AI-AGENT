import { NextResponse } from "next/server";
import { NETWORK_DATA, DISRUPTION_SCENARIO } from "@/lib/dataset.js";
import { runOptimizationSolver, runReorderPointBaseline } from "@/lib/optimizer.js";
import { runCoordinator } from "@/lib/agents.js";
import { runBenchmark } from "@/lib/evaluation.js";

export async function POST() {
  try {
    // Run all 3 approaches
    const [optimizerResult, ropResult, coordinatorResult] = await Promise.all([
      Promise.resolve(runOptimizationSolver(NETWORK_DATA, DISRUPTION_SCENARIO.disruptions)),
      Promise.resolve(runReorderPointBaseline(NETWORK_DATA, DISRUPTION_SCENARIO.disruptions)),
      runCoordinator(NETWORK_DATA, DISRUPTION_SCENARIO.disruptions, 14),
    ]);

    // Agent-assisted result from coordinator's solver output
    const agentSolverResult = {
      ...coordinatorResult.solver_output,
      approach: "AGENT_ASSISTED",
      trade_off_summary: coordinatorResult.trade_off_summary,
    };

    const benchmark = runBenchmark(
      optimizerResult,
      ropResult,
      agentSolverResult,
      NETWORK_DATA,
      DISRUPTION_SCENARIO.disruptions
    );

    return NextResponse.json({
      success: true,
      ...benchmark,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/benchmark] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Benchmark failed" },
      { status: 500 }
    );
  }
}
