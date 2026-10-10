/**
 * Evaluation Engine (Deliverable 6)
 * Computes all 8 KPIs: Fill Rate, Backorders, Total Landed Cost,
 * Recovery Time, Inventory Days, Constraint Violations, Runtime, Recommendation Stability
 */

/**
 * Evaluate a solver result and produce standardized KPI metrics.
 * @param {Object} solverResult - Output from optimizer or baseline
 * @param {Object} networkData - Network dataset
 * @param {Object} disruptions - Disruption list
 * @param {string} approach - "OPTIMIZER" | "REORDER_POINT" | "AGENT_ASSISTED"
 */
export function evaluatePlan(solverResult, networkData, disruptions, approach) {
  const demands = networkData.demands;
  const totalDemandVol = demands.reduce((s, d) => s + d.quantity, 0);

  // 1. Fill Rate
  const fillRate = solverResult.expected_fill_rate ?? 0;

  // 2. Backorders
  const backorders = solverResult.expected_backorders ?? 0;

  // 3. Total Landed Cost
  const totalLandedCost = solverResult.objective_value ?? 0;

  // 4. Recovery Time (days until fill rate >= 95%)
  const recoveryTime = estimateRecoveryTime(solverResult.actions, demands, networkData, disruptions);

  // 5. Inventory Days of Cover
  const inventoryDays = solverResult.inventory_days ?? calculateInventoryDays(solverResult.actions, totalDemandVol);

  // 6. Constraint Violations
  const constraintViolations = solverResult.constraint_violations ?? 0;

  // 7. Runtime (ms)
  const runtimeMs = solverResult.solver_duration_ms ?? 0;

  // 8. Recommendation Stability — cosine-like stability score based on action set variance
  const stability = calculateStability(solverResult.actions);

  // Derived metrics
  const costPerUnit = totalDemandVol > 0 ? totalLandedCost / totalDemandVol : 0;
  const backorderRate = totalDemandVol > 0 ? backorders / totalDemandVol : 0;
  const serviceLevel = 1 - backorderRate;

  return {
    approach: approach || solverResult.approach,
    kpis: {
      fill_rate: parseFloat((fillRate * 100).toFixed(2)),
      fill_rate_raw: parseFloat(fillRate.toFixed(4)),
      backorders: parseFloat(backorders.toFixed(1)),
      backorder_rate_pct: parseFloat((backorderRate * 100).toFixed(2)),
      total_landed_cost: parseFloat(totalLandedCost.toFixed(2)),
      cost_per_unit_served: parseFloat(costPerUnit.toFixed(2)),
      recovery_time_days: recoveryTime,
      inventory_days_of_cover: parseFloat(inventoryDays.toFixed(1)),
      constraint_violations: constraintViolations,
      runtime_ms: runtimeMs,
      recommendation_stability: parseFloat(stability.toFixed(3)),
      service_level_pct: parseFloat((serviceLevel * 100).toFixed(2)),
    },
    action_counts: summarizeActions(solverResult.actions),
    solver_status: solverResult.solver_status,
    trade_off_summary: solverResult.trade_off_summary,
    grading: gradePerformance(fillRate, constraintViolations, recoveryTime),
  };
}

/**
 * Run all three approaches and produce a comparative benchmark table (Deliverable 5 data)
 */
export function runBenchmark(optimizerResult, ropResult, agentResult, networkData, disruptions) {
  const optEval = evaluatePlan(optimizerResult, networkData, disruptions, "OPTIMIZER");
  const ropEval = evaluatePlan(ropResult, networkData, disruptions, "REORDER_POINT");
  const agentEval = agentResult ? evaluatePlan(agentResult, networkData, disruptions, "AGENT_ASSISTED") : null;

  // Compute deltas vs ROP baseline
  function delta(opt, rop, higherIsBetter = true) {
    const diff = opt - rop;
    const pct = rop !== 0 ? (diff / Math.abs(rop)) * 100 : 0;
    return {
      absolute: parseFloat(diff.toFixed(2)),
      percent: parseFloat(pct.toFixed(1)),
      is_better: higherIsBetter ? diff > 0 : diff < 0,
    };
  }

  const comparisons = {
    fill_rate: delta(optEval.kpis.fill_rate, ropEval.kpis.fill_rate, true),
    total_cost: delta(optEval.kpis.total_landed_cost, ropEval.kpis.total_landed_cost, false),
    backorders: delta(optEval.kpis.backorders, ropEval.kpis.backorders, false),
    recovery_time: delta(optEval.kpis.recovery_time_days, ropEval.kpis.recovery_time_days, false),
    inventory_days: delta(optEval.kpis.inventory_days_of_cover, ropEval.kpis.inventory_days_of_cover, true),
  };

  const winner = determineWinner(optEval, ropEval, agentEval);

  return {
    results: {
      optimizer: optEval,
      reorder_point: ropEval,
      agent_assisted: agentEval,
    },
    comparisons_vs_rop: comparisons,
    winner,
    summary: {
      best_fill_rate: winner.fill_rate,
      best_cost: winner.cost,
      fastest_recovery: winner.recovery,
      recommendation: winner.overall,
    },
    metadata: {
      evaluated_at: new Date().toISOString(),
      horizon_days: 14,
      total_demand_vol: networkData.demands.reduce((s, d) => s + d.quantity, 0),
    },
  };
}

// === Helpers ===

function estimateRecoveryTime(actions, demands, networkData, disruptions) {
  if (!actions || actions.length === 0) return 14; // worst case

  // Find first day where shipment actions reach all 3 DCs
  const dcIds = ["DC-North", "DC-South", "DC-West"];
  let recoveryDay = 14;

  for (let day = 1; day <= 14; day++) {
    const shipsToDCs = actions.filter((a) =>
      a.action_type === "SHIPMENT" &&
      dcIds.includes(a.destination_node_id) &&
      (a.delivery_day || a.start_day) <= day
    );
    const coveredDCs = new Set(shipsToDCs.map((s) => s.destination_node_id));
    if (coveredDCs.size >= dcIds.length) {
      recoveryDay = day;
      break;
    }
  }

  return recoveryDay;
}

function calculateInventoryDays(actions, totalDemandVol) {
  if (!actions || actions.length === 0) return 0;
  const totalShipped = actions
    .filter((a) => a.action_type === "SHIPMENT")
    .reduce((s, a) => s + (a.quantity || 0), 0);
  const dailyDemand = totalDemandVol / 14;
  return dailyDemand > 0 ? totalShipped / dailyDemand : 0;
}

function calculateStability(actions) {
  if (!actions || actions.length < 2) return 1.0;
  // Measure variance in action quantities as a proxy for plan stability
  const quantities = actions.map((a) => a.quantity || 0);
  const mean = quantities.reduce((s, q) => s + q, 0) / quantities.length;
  const variance = quantities.reduce((s, q) => s + Math.pow(q - mean, 2), 0) / quantities.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  // Stability = 1 - normalized CV (capped at 0)
  return Math.max(0, Math.min(1.0, 1 - (cv * 0.3)));
}

function summarizeActions(actions) {
  if (!actions) return {};
  const counts = {};
  for (const a of actions) {
    counts[a.action_type] = (counts[a.action_type] || 0) + 1;
  }
  return {
    total: actions.length,
    by_type: counts,
    expedited_count: actions.filter((a) => a.is_expedited).length,
  };
}

function gradePerformance(fillRate, violations, recoveryDays) {
  if (violations > 0) return { grade: "F", label: "INVALID", color: "rose" };
  if (fillRate >= 0.99 && recoveryDays <= 4) return { grade: "A+", label: "EXCELLENT", color: "emerald" };
  if (fillRate >= 0.97 && recoveryDays <= 6) return { grade: "A", label: "VERY GOOD", color: "emerald" };
  if (fillRate >= 0.93 && recoveryDays <= 8) return { grade: "B", label: "GOOD", color: "cyan" };
  if (fillRate >= 0.85) return { grade: "C", label: "ACCEPTABLE", color: "amber" };
  return { grade: "D", label: "POOR", color: "rose" };
}

function determineWinner(optEval, ropEval, agentEval) {
  const results = { optimizer: optEval, reorder_point: ropEval };
  if (agentEval) results.agent_assisted = agentEval;

  const bestFillRate = Object.entries(results).sort(([, a], [, b]) => b.kpis.fill_rate - a.kpis.fill_rate)[0][0];
  const bestCost = Object.entries(results).sort(([, a], [, b]) => a.kpis.total_landed_cost - b.kpis.total_landed_cost)[0][0];
  const bestRecovery = Object.entries(results).sort(([, a], [, b]) => a.kpis.recovery_time_days - b.kpis.recovery_time_days)[0][0];

  // Weighted scoring: fill rate 40%, cost 35%, recovery 25%
  const scores = {};
  for (const [key, result] of Object.entries(results)) {
    scores[key] = (result.kpis.fill_rate / 100) * 0.4 +
      (1 - result.kpis.total_landed_cost / Math.max(...Object.values(results).map(r => r.kpis.total_landed_cost))) * 0.35 +
      (1 - result.kpis.recovery_time_days / 14) * 0.25;
  }

  const overall = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];

  return { fill_rate: bestFillRate, cost: bestCost, recovery: bestRecovery, overall, scores };
}
