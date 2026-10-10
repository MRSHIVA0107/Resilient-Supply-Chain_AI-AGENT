/**
 * What-If Scenario Simulation Engine (Deliverable 5)
 * Allows interactive simulation of disruption variations, supplier capacity shifts,
 * expediting policies, demand shocks, and transit delays with OpenRouter AI rationale.
 */

import { NETWORK_DATA, DISRUPTION_SCENARIO } from "./dataset.js";
import { runCoordinator, callLLM, DEFAULT_MODEL } from "./agents.js";
import { runOptimizationSolver } from "./optimizer.js";
import { evaluatePlan } from "./evaluation.js";

/**
 * Deep clone an object to prevent mutating source dataset
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Run a parameterized What-If simulation
 * @param {Object} params - Overrides for the scenario
 * @param {Object} baseNetwork - Base network data (defaults to NETWORK_DATA)
 * @param {Object} baseDisruptions - Base disruptions (defaults to DISRUPTION_SCENARIO.disruptions)
 */
export async function runWhatIfSimulation(
  params = {},
  baseNetwork = NETWORK_DATA,
  baseDisruptions = DISRUPTION_SCENARIO.disruptions
) {
  const startTime = Date.now();

  const {
    disruption_days = 7,
    disruption_severity = 1.0,
    s2_capacity_multiplier = 1.0,
    s3_expedited_enabled = true,
    demand_shock_percent = 0,
    transit_delay_days = 0,
    preferred_model = DEFAULT_MODEL,
  } = params;

  // 1. Clone network and disruption scenarios
  const network = deepClone(baseNetwork);
  const disruptions = deepClone(baseDisruptions);

  // 2. Apply disruption parameter overrides
  for (const dis of disruptions) {
    if (dis.target_node_id === "S1") {
      dis.start_day = 1;
      dis.end_day = Math.min(14, Math.max(1, Math.round(disruption_days)));
      dis.severity = Math.max(0, Math.min(1.0, disruption_severity));
      dis.prevents_new_shipments = dis.severity > 0;
    }
  }

  // 3. Apply S2 capacity multiplier
  for (const cap of network.supplier_capabilities) {
    if (cap.supplier_id === "S2") {
      cap.max_daily_capacity = Math.round(cap.max_daily_capacity * s2_capacity_multiplier);
    }
    // If S3 air expedited disabled, mark S3 non-expedited
    if (cap.supplier_id === "S3" && !s3_expedited_enabled) {
      cap.lead_time_days = Math.max(cap.lead_time_days, 5);
    }
  }

  // 4. Apply transit lane changes
  for (const lane of network.lanes) {
    if (transit_delay_days > 0) {
      lane.normal_lead_time_days += transit_delay_days;
      lane.expedited_lead_time_days += Math.floor(transit_delay_days / 2);
    }
    if (!s3_expedited_enabled && lane.origin_node_id === "S3") {
      lane.expedited_lead_time_days = 99; // effectively disabled
    }
  }

  // 5. Apply demand shock
  if (demand_shock_percent !== 0) {
    const mult = 1 + demand_shock_percent / 100;
    for (const d of network.demands) {
      d.quantity = Math.max(0, Math.round(d.quantity * mult));
    }
  }

  // 6. Run the coordinator across the modified network
  const coordinatorResult = await runCoordinator(network, disruptions, 14, preferred_model);
  const solverOutput = coordinatorResult.solver_output;
  const evaluation = evaluatePlan(solverOutput, network, disruptions, "WHAT_IF");

  // 7. Calculate baseline metrics for comparison
  const baseSolver = runOptimizationSolver(baseNetwork, baseDisruptions);
  const baseEval = evaluatePlan(baseSolver, baseNetwork, baseDisruptions, "BASELINE");

  // Compute deltas vs baseline
  const fillRateDelta = evaluation.kpis.fill_rate - baseEval.kpis.fill_rate;
  const costDelta = evaluation.kpis.total_landed_cost - baseEval.kpis.total_landed_cost;
  const backorderDelta = evaluation.kpis.backorders - baseEval.kpis.backorders;
  const recoveryDelta = evaluation.kpis.recovery_time_days - baseEval.kpis.recovery_time_days;

  // 8. OpenRouter AI What-If Rationale & Confidence Analysis
  const aiPrompt = `You are a Senior Supply Chain Strategy & Risk AI Officer evaluating an exploratory What-If scenario:
Parameters Tested:
- S1 Outage Duration: ${disruption_days} days (Severity: ${(disruption_severity * 100).toFixed(0)}%)
- S2 (Pacific Silicon) Capacity Multiplier: ${(s2_capacity_multiplier * 100).toFixed(0)}%
- S3 Air Expedited Transport: ${s3_expedited_enabled ? "ENABLED" : "DISABLED"}
- Customer Demand Shock: ${demand_shock_percent > 0 ? `+${demand_shock_percent}% surge` : `${demand_shock_percent}%`}
- Transit Corridors Delay: +${transit_delay_days} days

Simulation Outcomes:
- Projected Fill Rate: ${evaluation.kpis.fill_rate.toFixed(1)}% (Delta vs Baseline: ${fillRateDelta > 0 ? "+" : ""}${fillRateDelta.toFixed(1)}%)
- Total Landed Cost: $${evaluation.kpis.total_landed_cost.toLocaleString()} (Delta vs Baseline: ${costDelta > 0 ? "+$" : "-$"}${Math.abs(costDelta).toLocaleString()})
- Backorders: ${evaluation.kpis.backorders.toFixed(0)} units (Delta: ${backorderDelta > 0 ? "+" : ""}${backorderDelta.toFixed(0)})
- Recovery Time: ${evaluation.kpis.recovery_time_days.toFixed(1)} days

Provide a structured strategic briefing for supply chain planners:
1. CONFIDENCE SCORE: A number from 0 to 100 based on physical feasibility and risk margin.
2. RISK RATING: Exactly one of [LOW, MODERATE, HIGH, CRITICAL].
3. SCENARIO RATIONALE: 2 concise paragraphs analyzing how these specific parameter changes propagate through assembly buffers, lead times, and alternate supplier bottlenecks.
4. ACTIONABLE MITIGATIONS: 2 concrete operational steps the planner should take if this scenario materializes.`;

  const aiRes = await callLLM(
    "You are an expert industrial supply chain risk officer. Provide quantitative, decisive, and actionable risk reasoning.",
    aiPrompt,
    650,
    preferred_model
  );

  // Parse confidence and risk rating from AI response or fallback
  let confidenceScore = 88;
  let riskRating = "MODERATE";
  const content = aiRes.content;

  if (content) {
    const confMatch = content.match(/CONFIDENCE(?:\s+SCORE)?[:\s]+(\d{1,3})/i);
    if (confMatch) confidenceScore = Math.min(100, Math.max(10, parseInt(confMatch[1], 10)));

    if (/CRITICAL/i.test(content)) riskRating = "CRITICAL";
    else if (/HIGH/i.test(content)) riskRating = "HIGH";
    else if (/LOW/i.test(content)) riskRating = "LOW";
    else riskRating = "MODERATE";
  } else {
    // Deterministic confidence calculation based on fill rate and capacity
    if (evaluation.kpis.fill_rate >= 95 && s2_capacity_multiplier >= 1.0) {
      confidenceScore = 92;
      riskRating = "LOW";
    } else if (evaluation.kpis.fill_rate >= 80) {
      confidenceScore = 78;
      riskRating = "MODERATE";
    } else if (evaluation.kpis.fill_rate >= 60) {
      confidenceScore = 55;
      riskRating = "HIGH";
    } else {
      confidenceScore = 35;
      riskRating = "CRITICAL";
    }
  }

  const deterministicRationale =
    `What-if scenario simulated S1 outage of ${disruption_days} days with S2 capacity at ${(s2_capacity_multiplier * 100).toFixed(0)}% and ` +
    `demand shock of ${demand_shock_percent}%. Resulting fill rate is ${evaluation.kpis.fill_rate.toFixed(1)}% ` +
    `with landed cost of $${evaluation.kpis.total_landed_cost.toLocaleString()}. ` +
    (fillRateDelta < 0
      ? `Service level degraded by ${Math.abs(fillRateDelta).toFixed(1)}% due to capacity throttling and lead time constraints.`
      : `Service level remained robust through agile allocation to alternate qualified suppliers.`);

  return {
    simulation_duration_ms: Date.now() - startTime,
    parameters: {
      disruption_days,
      disruption_severity,
      s2_capacity_multiplier,
      s3_expedited_enabled,
      demand_shock_percent,
      transit_delay_days,
      preferred_model,
    },
    metrics: evaluation.kpis,
    baseline_metrics: baseEval.kpis,
    deltas_vs_baseline: {
      fill_rate_delta: parseFloat(fillRateDelta.toFixed(2)),
      cost_delta: parseFloat(costDelta.toFixed(2)),
      backorders_delta: parseFloat(backorderDelta.toFixed(1)),
      recovery_time_delta: parseFloat(recoveryDelta.toFixed(1)),
    },
    ai_evaluation: {
      confidence_score: confidenceScore,
      risk_rating: riskRating,
      rationale: aiRes.content || deterministicRationale,
      model_used: aiRes.model_used,
      tokens_used: aiRes.tokens_used,
    },
    coordinator_result: coordinatorResult,
    evaluation: evaluation,
  };
}
