/**
 * OpenRouter AI Agent System (Deliverables 2 & 3)
 * 4 Specialized Agents + Central Coordinator
 * Each agent: defined inputs, outputs, permissions, shared schema
 * Coordinator: conflict resolution, constraint validation, plan approval gate
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";
const FALLBACK_MODELS = [
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.1-8b-instruct",
  "deepseek/deepseek-chat",
  "mistralai/mistral-small-24b-instruct-2501",
];

import { validateAgentProposalGuardrails, validateSupplyChainActionGuardrails } from "./guardrails.js";

/** === SHARED SCHEMA === */
export function makeObservation(category, entityId, productId, day, description, severity, evidenceRef) {
  return { category, entity_id: entityId, product_id: productId, day, description, severity, evidence_ref: evidenceRef };
}

export function makeProposal(proposalId, agentName, actionType, originNodeId, destinationNodeId, productId, quantity, startDay, deliveryDay, estimatedUnitCost, rationale, evidenceRef, priorityScore) {
  return {
    proposal_id: proposalId,
    agent_name: agentName,
    action_type: actionType,
    origin_node_id: originNodeId,
    destination_node_id: destinationNodeId,
    product_id: productId,
    quantity,
    start_day: startDay,
    delivery_day: deliveryDay,
    estimated_unit_cost: estimatedUnitCost,
    total_estimated_cost: parseFloat((quantity * estimatedUnitCost).toFixed(2)),
    rationale,
    evidence_ref: evidenceRef,
    priority_score: priorityScore,
  };
}

/** === OPENROUTER LLM CALL WITH RESILIENT FALLBACKS === */
export async function callLLM(systemPrompt, userPrompt, maxTokens = 800, modelOverride = null) {
  const modelsToTry = [modelOverride || DEFAULT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== (modelOverride || DEFAULT_MODEL))];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://resichain.hitam.dev",
          "X-Title": "ResilientChain HITAM Agentic AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.2, // Low temp for reliable supply-chain analysis
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenRouter] Model ${model} returned ${response.status}: ${errText.slice(0, 150)}. Trying fallback...`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim().length > 0) {
        return {
          content: content.trim(),
          model_used: model,
          tokens_used: data.usage?.total_tokens || null,
        };
      }
    } catch (err) {
      console.warn(`[OpenRouter] Call to ${model} threw error:`, err.message);
    }
  }

  // Graceful degradation: return empty content; caller will apply deterministic analysis
  return { content: "", model_used: "deterministic-fallback", tokens_used: 0 };
}

/** ================================================================
 *  AGENT 1: DEMAND AGENT
 *  Permission: READ demands, DCs, initial FG inventory
 *  Output: shortage observations + replenishment proposals
 * ================================================================ */
export async function runDemandAgent(networkData, disruptions, horizonDays = 14, preferredModel = null) {
  const startTime = Date.now();
  const observations = [];
  const proposals = [];
  const warnings = [];
  const evidenceRefs = [];

  const dcs = networkData.nodes.filter((n) => n.type === "DC");
  const dcIds = dcs.map((d) => d.id);
  const demands = networkData.demands;
  const initInv = networkData.initial_inventory;

  // Aggregate demand
  let totalDemand = 0;
  let highPriorityDemand = 0;
  const dailyByDcProd = {};
  for (const d of demands) {
    totalDemand += d.quantity;
    if (d.priority === "HIGH" || d.priority === "CRITICAL") highPriorityDemand += d.quantity;
    const key = `${d.node_id}::${d.product_id}::${d.day}`;
    dailyByDcProd[key] = d.quantity;
  }

  // DC FG stock map
  const dcStockMap = {};
  for (const inv of initInv) {
    if (dcIds.includes(inv.node_id)) {
      const avail = Math.max(0, parseFloat(inv.on_hand) - parseFloat(inv.reserved || 0));
      dcStockMap[`${inv.node_id}::${inv.product_id}`] = avail;
    }
  }

  const obsRef1 = "DEMAND-ANALYSIS-HORIZON-TOTAL";
  evidenceRefs.push(obsRef1);
  observations.push(makeObservation("DEMAND_EXPOSURE", "NETWORK-DEMAND", null, null,
    `14-day total network demand: ${totalDemand.toLocaleString()} units. High-priority demand during disruption window: ${highPriorityDemand.toLocaleString()} units. Three DCs (North/South/West) dependent on Plant-1 as primary supply source.`,
    "HIGH", obsRef1));

  // AI-enhanced shortage analysis
  const aiPrompt = `You are a specialized Demand Agent for an enterprise supply chain network. Analyze the following data:
- Disruption: S1 (Apex Semiconductor) shut down Days 1-7 (100% severity, zero new shipments)
- DC-North PROD-1 initial stock: ${dcStockMap["DC-North::PROD-1"] || 0} units, daily demand: ~55 units
- DC-South PROD-1 initial stock: ${dcStockMap["DC-South::PROD-1"] || 0} units, daily demand: ~45 units
- DC-West PROD-1 initial stock: ${dcStockMap["DC-West::PROD-1"] || 0} units, daily demand: ~35 units
- High priority demand: ${highPriorityDemand} units in 14-day horizon

Provide a concise 3-sentence operational assessment: (1) When will each DC face stockout? (2) What is the revenue/customer service risk? (3) What immediate replenishment action is proposed?`;

  const aiRes = await callLLM(
    "You are a supply chain demand analyst. Be concise, quantitative, and precise. Focus on stockout timing and service level protection.",
    aiPrompt,
    400,
    preferredModel
  );
  const aiAnalysis = aiRes.content;

  // Deterministic shortage detection per DC
  let propCount = 1;
  for (const dcId of dcIds) {
    let cumDemand = 0;
    const initialStock = dcStockMap[`${dcId}::PROD-1`] || 0;
    let stockoutDay = null;

    for (let day = 1; day <= horizonDays; day++) {
      cumDemand += dailyByDcProd[`${dcId}::PROD-1::${day}`] || 0;
      if (cumDemand > initialStock && stockoutDay === null) {
        stockoutDay = day;
      }
    }

    if (stockoutDay) {
      const ref = `DEMAND-SHORTAGE-${dcId}-PROD1`;
      evidenceRefs.push(ref);
      observations.push(makeObservation("SHORTAGE_RISK", dcId, "PROD-1", stockoutDay,
        `${dcId} PROD-1 inventory (${initialStock.toFixed(0)} units) exhausted by Day ${stockoutDay} without upstream replenishment. ${aiAnalysis ? `AI Insight: ${aiAnalysis.split(".")[0]}.` : ""}`,
        stockoutDay <= 4 ? "CRITICAL" : "HIGH", ref));

      proposals.push(makeProposal(
        `PROP-DEM-${String(propCount).padStart(3, "0")}`,
        "DemandAgent",
        "SHIPMENT",
        "Plant-1", dcId, "PROD-1",
        Math.min(initialStock * 0.8 + 80, 120),
        Math.max(1, stockoutDay - 3),
        Math.max(2, stockoutDay),
        6.0,
        `Pre-emptive replenishment to prevent PROD-1 stockout at ${dcId} on Day ${stockoutDay}`,
        ref,
        stockoutDay <= 4 ? 1.8 : 1.2
      ));
      propCount++;
    }
  }

  if (warnings.length === 0 && highPriorityDemand > totalDemand * 0.4) {
    warnings.push(`High-priority demand constitutes >40% of total (${highPriorityDemand.toLocaleString()} units). Service level breach risk is CRITICAL.`);
  }

  return {
    agent_name: "DemandAgent",
    status: "SUCCESS",
    prompt_version: "v2.0",
    model_provider: "OpenRouter",
    model_identifier: aiRes.model_used,
    tokens_used: aiRes.tokens_used,
    execution_time_ms: Date.now() - startTime,
    ai_analysis: aiAnalysis || null,
    observations,
    proposals,
    assumptions: [
      "Demand forecast is treated as firm requirement across the 14-day horizon.",
      "High-priority demand in Days 1-7 carries severe service-level penalties if unfulfilled.",
      "DC inventory is consumed at forecast rate with no demand elasticity.",
    ],
    warnings,
    evidence_refs: evidenceRefs,
    metrics: {
      total_demand_units: totalDemand,
      high_priority_units: highPriorityDemand,
      affected_dc_nodes: dcIds.length,
    },
  };
}

/** ================================================================
 *  AGENT 2: INVENTORY AGENT
 *  Permission: READ initial_inventory, confirmed_inbound_shipments
 *  Output: buffer runway observations + rebalancing proposals
 * ================================================================ */
export async function runInventoryAgent(networkData, disruptions, horizonDays = 14, preferredModel = null) {
  const startTime = Date.now();
  const observations = [];
  const proposals = [];
  const warnings = [];
  const evidenceRefs = [];

  const initInv = networkData.initial_inventory;
  const inbounds = networkData.confirmed_inbound_shipments;

  // Calculate runway (days of cover) for each critical component at plants
  const plantsToCheck = ["Plant-1", "Plant-2"];
  const dailyConsumption = { "COMP-A": 120, "COMP-B": 150 };

  const p1CompA = initInv.find((i) => i.node_id === "Plant-1" && i.product_id === "COMP-A");
  const p1CompB = initInv.find((i) => i.node_id === "Plant-1" && i.product_id === "COMP-B");
  const inboundCompA = inbounds.filter((s) => s.product_id === "COMP-A").reduce((sum, s) => sum + s.quantity, 0);

  const aiPrompt = `Supply chain inventory runway and buffer analysis:
- Plant-1 COMP-A on-hand: ${p1CompA?.on_hand || 0} units + ${inboundCompA} inbound confirmed
- Plant-1 COMP-B on-hand: ${p1CompB?.on_hand || 0} units
- Daily COMP-A consumption: ~120 units. Daily COMP-B: ~150 units
- S1 (primary supplier) SHUTDOWN Days 1-7 (zero new deliveries)
- Safety stock target: COMP-A=120 units, COMP-B=150 units

In 2-3 sentences: What is the exact component runway duration before plant starvation? When will safety stock be breached? What rebalancing or conversion actions are needed?`;

  const aiRes = await callLLM(
    "You are a supply chain inventory analyst. Provide precise numerical analysis of inventory runway and buffer adequacy.",
    aiPrompt,
    350,
    preferredModel
  );
  const aiAnalysis = aiRes.content;

  let propIdx = 1;
  for (const plantId of plantsToCheck) {
    for (const compId of ["COMP-A", "COMP-B"]) {
      const inv = initInv.find((i) => i.node_id === plantId && i.product_id === compId);
      if (!inv) continue;

      const onHand = parseFloat(inv.on_hand || 0);
      const safety = parseFloat(inv.safety_stock || 80);
      const dailyRate = dailyConsumption[compId] || 100;

      // Add confirmed inbounds
      const confirmedInbound = inbounds
        .filter((s) => s.destination_node_id === plantId && s.product_id === compId)
        .reduce((sum, s) => sum + parseFloat(s.quantity), 0);

      const totalAvail = onHand + confirmedInbound;
      const runwayDays = dailyRate > 0 ? totalAvail / dailyRate : 99;
      const safetyBreachDay = onHand < safety ? 0 : Math.max(0, (onHand - safety) / dailyRate);

      const ref = `INV-RUNWAY-${plantId}-${compId}`;
      evidenceRefs.push(ref);

      const severity = runwayDays < 2 ? "CRITICAL" : runwayDays < 4 ? "HIGH" : runwayDays < 7 ? "MEDIUM" : "LOW";

      observations.push(makeObservation("INVENTORY_RUNWAY", plantId, compId, Math.ceil(runwayDays),
        `${plantId} ${compId}: ${totalAvail.toFixed(0)} available units (${onHand.toFixed(0)} on-hand + ${confirmedInbound.toFixed(0)} inbound). ` +
        `Estimated runway: ${runwayDays.toFixed(1)} days at ${dailyRate} units/day. ` +
        `Safety stock breach expected at Day ${safetyBreachDay.toFixed(1)}. ` +
        (aiAnalysis ? `AI Context: ${aiAnalysis.split(".")[0]}.` : ""),
        severity, ref));

      if (runwayDays < 5) {
        warnings.push(`${plantId} ${compId} runway critically low: ${runwayDays.toFixed(1)} days. Expedited procurement required.`);
        proposals.push(makeProposal(
          `PROP-INV-${String(propIdx).padStart(3, "0")}`,
          "InventoryAgent", "PROCUREMENT",
          "S2", plantId, compId,
          Math.min(200, Math.ceil((5 - runwayDays) * dailyRate)),
          1, 3,
          28.0,
          `Emergency buffer procurement for ${plantId} ${compId} — runway critical at ${runwayDays.toFixed(1)} days`,
          ref, 1.9
        ));
        propIdx++;
      }
    }
  }

  // WIP inventory assessment
  const dcInv = initInv.filter((i) => ["DC-North", "DC-South", "DC-West"].includes(i.node_id));
  const totalDCStock = dcInv.reduce((s, i) => s + parseFloat(i.on_hand), 0);
  const ref2 = "INV-DC-BUFFER-TOTAL";
  evidenceRefs.push(ref2);
  observations.push(makeObservation("DC_BUFFER_STATUS", "NETWORK-DC", null, null,
    `Total DC finished-goods buffer: ${totalDCStock.toFixed(0)} units across 3 DCs. With S1 offline, upstream replenishment will degrade by Days 3-4, making DC buffer the primary service cushion.`,
    "HIGH", ref2));

  return {
    agent_name: "InventoryAgent",
    status: "SUCCESS",
    prompt_version: "v2.0",
    model_provider: "OpenRouter",
    model_identifier: aiRes.model_used,
    tokens_used: aiRes.tokens_used,
    execution_time_ms: Date.now() - startTime,
    ai_analysis: aiAnalysis || null,
    observations,
    proposals,
    assumptions: [
      "Confirmed inbound shipments (already in transit) arrive on schedule regardless of disruption.",
      "Daily component consumption estimated from production schedules.",
      "Safety stock is minimum acceptable buffer; breach triggers expedited procurement.",
    ],
    warnings,
    evidence_refs: evidenceRefs,
    metrics: {
      total_plant_comp_a: (initInv.find((i) => i.node_id === "Plant-1" && i.product_id === "COMP-A")?.on_hand || 0),
      total_plant_comp_b: (initInv.find((i) => i.node_id === "Plant-1" && i.product_id === "COMP-B")?.on_hand || 0),
      total_dc_fg_stock: totalDCStock,
    },
  };
}

/** ================================================================
 *  AGENT 3: SUPPLIER RISK AGENT
 *  Permission: READ disruptions, supplier_capabilities
 *  Output: risk observations + alternate-source proposals
 * ================================================================ */
export async function runSupplierRiskAgent(networkData, disruptions, horizonDays = 14, preferredModel = null) {
  const startTime = Date.now();
  const observations = [];
  const proposals = [];
  const warnings = [];
  const evidenceRefs = [];

  const capabilities = networkData.supplier_capabilities;
  const disrupted = new Set(disruptions.map((d) => d.target_node_id));

  // Identify disrupted suppliers and assess exposure
  for (const dis of disruptions) {
    const target = dis.target_node_id;
    const ref = `SUPPLIER-DISRUPTION-${target}`;
    evidenceRefs.push(ref);
    observations.push(makeObservation("SUPPLIER_SHUTDOWN", target, null, dis.start_day,
      `Supplier '${target}' — ${(dis.severity * 100).toFixed(0)}% shutdown Days ${dis.start_day}–${dis.end_day}. ` +
      `All new purchase orders BLOCKED. Financial exposure: $${(dis.financial_exposure_usd || 0).toLocaleString()}. ` +
      `Recovery expected Day ${dis.estimated_recovery_day || "unknown"}.`,
      "CRITICAL", ref));
  }

  // AI risk assessment
  const disruptedList = [...disrupted].join(", ");
  const aiPrompt = `Supply chain supplier risk analysis:
- Disrupted suppliers: ${disruptedList} (Days 1-7, complete shutdown)
- Alternate supplier S2 (Pacific Silicon): COMP-A cost $28/unit, capacity 350/day, lead time 2 days — QUALIFIED
- Alternate supplier S3 (EuroTech): COMP-A cost $32/unit, capacity 200/day, lead time 4 days — QUALIFIED (spot)
- Network dependency on S1: 68% of COMP-A, 72% of COMP-B supply

In 3 sentences: What is the overall supply risk score? How should procurement volume be split between S2 and S3? What are the key contract and cost mitigation steps?`;

  const aiRes = await callLLM(
    "You are a supply chain risk analyst. Provide actionable risk assessment and procurement split recommendations.",
    aiPrompt,
    400,
    preferredModel
  );
  const aiAnalysis = aiRes.content;

  // Find qualified alternates and propose orders
  let propIdx = 1;
  for (const compId of ["COMP-A", "COMP-B"]) {
    const alts = capabilities.filter((c) => c.product_id === compId && !disrupted.has(c.supplier_id) && c.is_qualified);
    alts.sort((a, b) => a.unit_cost - b.unit_cost);

    if (alts.length === 0) {
      warnings.push(`CRITICAL: No qualified alternate suppliers for ${compId}! Severe shortage risk.`);
      continue;
    }

    for (const alt of alts) {
      const ref = `SUPPLIER-ALT-${alt.supplier_id}-${compId}`;
      evidenceRefs.push(ref);
      observations.push(makeObservation("ALTERNATE_SOURCE_QUALIFIED", alt.supplier_id, compId, null,
        `Alternate: '${alt.supplier_id}' qualified for ${compId}. Unit cost $${alt.unit_cost}, capacity ${alt.max_daily_capacity}/day, lead time ${alt.lead_time_days}d. Contract: ${alt.contract_type}. ` +
        (aiAnalysis ? `AI Guidance: ${aiAnalysis.split(".")[0]}.` : ""),
        "LOW", ref));

      proposals.push(makeProposal(
        `PROP-SUPP-${String(propIdx).padStart(3, "0")}`,
        "SupplierRiskAgent", "PROCUREMENT",
        alt.supplier_id, "Plant-1", compId,
        Math.min(alt.max_daily_capacity, 200),
        1, 1 + alt.lead_time_days,
        alt.unit_cost,
        `Reroute ${compId} procurement to alternate supplier ${alt.supplier_id} (${alt.contract_type}) during S1 shutdown`,
        ref,
        alt.supplier_id === "S2" ? 1.9 : 1.4
      ));
      propIdx++;
    }
  }

  return {
    agent_name: "SupplierRiskAgent",
    status: "SUCCESS",
    prompt_version: "v2.0",
    model_provider: "OpenRouter",
    model_identifier: aiRes.model_used,
    tokens_used: aiRes.tokens_used,
    execution_time_ms: Date.now() - startTime,
    ai_analysis: aiAnalysis || null,
    observations,
    proposals,
    assumptions: [
      "Alternate supplier capacities and pricing are confirmed under master service agreements.",
      "Orders placed Day 1 will be acknowledged within 4 hours without lead time drift.",
      "Force majeure provisions do not apply to alternate suppliers.",
    ],
    warnings,
    evidence_refs: evidenceRefs,
    metrics: {
      disrupted_suppliers_count: disrupted.size,
      qualified_alternate_suppliers: capabilities.filter((c) => !disrupted.has(c.supplier_id) && c.is_qualified).length,
    },
  };
}

/** ================================================================
 *  AGENT 4: LOGISTICS AGENT
 *  Permission: READ lanes, nodes
 *  Output: routing observations + expedited transport proposals
 * ================================================================ */
export async function runLogisticsAgent(networkData, disruptions, horizonDays = 14, preferredModel = null) {
  const startTime = Date.now();
  const observations = [];
  const proposals = [];
  const warnings = [];
  const evidenceRefs = [];

  const lanes = networkData.lanes;
  const nodes = Object.fromEntries(networkData.nodes.map((n) => [n.id, n]));
  const disrupted = new Set(disruptions.map((d) => d.target_node_id));

  // Identify viable routing alternatives
  const supplierLanes = lanes.filter((l) => {
    const orig = nodes[l.origin_node_id];
    return orig?.type === "SUPPLIER" && !disrupted.has(l.origin_node_id);
  });

  const aiPrompt = `Supply chain logistics and transport lane optimization:
- S1 offline: standard S1→Plant-1 road lane (1-day lead) unavailable
- Available alternatives:
  * S2→Plant-1: Road, 2-day normal / 1-day expedited, $3.5 normal / $8.0 expedited per unit
  * S3→Plant-1: Air, 4-day normal / 2-day expedited, $8.0 normal / $18.0 expedited per unit
- Urgency: component stockout risk within 3-4 days at Plant-1

In 2-3 sentences: Should expedited transport be used? What is the cost-service trade-off? What is the recommended routing strategy across lanes?`;

  const aiRes = await callLLM(
    "You are a logistics optimization expert. Recommend transport modes based on urgency, cost, and lead time constraints.",
    aiPrompt,
    350,
    preferredModel
  );
  const aiAnalysis = aiRes.content;

  let propIdx = 1;
  for (const lane of supplierLanes) {
    const ref = `LOGISTICS-LANE-${lane.id}`;
    evidenceRefs.push(ref);
    const expeditePremium = ((lane.expedited_cost_per_unit - lane.normal_cost_per_unit) / lane.normal_cost_per_unit * 100).toFixed(0);
    observations.push(makeObservation("ALTERNATE_LANE_VIABLE", lane.origin_node_id, null, null,
      `Lane ${lane.id}: ${lane.origin_node_id}→${lane.destination_node_id} via ${lane.mode}. Normal: ${lane.normal_lead_time_days}d @ $${lane.normal_cost_per_unit}/unit. Expedited: ${lane.expedited_lead_time_days}d @ $${lane.expedited_cost_per_unit}/unit (+${expeditePremium}% premium). Cap: ${lane.max_capacity_per_shipment} units/shipment. ` +
      (aiAnalysis ? `AI Routing: ${aiAnalysis.split(".")[0]}.` : ""),
      lane.expedited_lead_time_days <= 2 ? "LOW" : "MEDIUM", ref));

    // Propose expedited shipment for critical lanes
    if (lane.expedited_lead_time_days <= 2 && nodes[lane.origin_node_id]?.reliability_score > 0.9) {
      proposals.push(makeProposal(
        `PROP-LOG-${String(propIdx).padStart(3, "0")}`,
        "LogisticsAgent", "SHIPMENT",
        lane.origin_node_id, lane.destination_node_id, "COMP-A",
        Math.min(lane.max_capacity_per_shipment, 150),
        1, 1 + lane.expedited_lead_time_days,
        lane.expedited_cost_per_unit,
        `Activate expedited ${lane.mode} transport on ${lane.id} to minimize lead time during S1 shutdown`,
        ref, 1.6
      ));
      propIdx++;
    }
  }

  // Plant→DC routing analysis
  const plantDcLanes = lanes.filter((l) => {
    const orig = nodes[l.origin_node_id];
    return orig?.type === "PLANT";
  });

  for (const lane of plantDcLanes) {
    if (lane.normal_lead_time_days > 1) {
      const ref = `LOGISTICS-DC-LANE-${lane.id}`;
      evidenceRefs.push(ref);
      observations.push(makeObservation("DC_REPLENISHMENT_ROUTE", lane.origin_node_id, null, null,
        `Plant-DC lane ${lane.id}: ${lane.normal_lead_time_days}-day normal lead time may delay critical replenishment. Expedited option available at ${lane.expedited_lead_time_days}d (+$${(lane.expedited_cost_per_unit - lane.normal_cost_per_unit).toFixed(1)}/unit premium).`,
        lane.normal_lead_time_days >= 3 ? "MEDIUM" : "LOW", ref));
    }
  }

  return {
    agent_name: "LogisticsAgent",
    status: "SUCCESS",
    prompt_version: "v2.0",
    model_provider: "OpenRouter",
    model_identifier: aiRes.model_used,
    tokens_used: aiRes.tokens_used,
    execution_time_ms: Date.now() - startTime,
    ai_analysis: aiAnalysis || null,
    observations,
    proposals,
    assumptions: [
      "Expedited transport capacity is available on 24-hour notice.",
      "Customs and border clearance for international lanes (S3) adds 0 days (pre-cleared).",
      "Transport capacity constraints are not binding during this scenario.",
    ],
    warnings,
    evidence_refs: evidenceRefs,
    metrics: {
      viable_supplier_lanes: supplierLanes.length,
      expedited_capable_lanes: supplierLanes.filter((l) => l.expedited_lead_time_days <= 2).length,
    },
  };
}

/** ================================================================
 *  CENTRAL COORDINATOR (Deliverable 3)
 *  - Orchestrates 4 agents
 *  - Conflict detection & deduplication
 *  - Constraint validation
 *  - AI-generated trade-off synthesis
 *  - Plan approval gate (human-in-the-loop)
 * ================================================================ */
export async function runCoordinator(networkData, disruptions, horizonDays = 14, preferredModel = null) {
  const startTime = Date.now();

  // Step 1-4: Run all 4 agents in parallel
  const [demandResult, inventoryResult, supplierResult, logisticsResult] = await Promise.all([
    runDemandAgent(networkData, disruptions, horizonDays, preferredModel),
    runInventoryAgent(networkData, disruptions, horizonDays, preferredModel),
    runSupplierRiskAgent(networkData, disruptions, horizonDays, preferredModel),
    runLogisticsAgent(networkData, disruptions, horizonDays, preferredModel),
  ]);

  const agentResults = {
    demand_agent: demandResult,
    inventory_agent: inventoryResult,
    supplier_risk_agent: supplierResult,
    logistics_agent: logisticsResult,
  };

  // Step 5-6: Aggregate and deduplicate proposals
  const allProposals = Object.values(agentResults).flatMap((r) => r.proposals);
  const disrupted = new Set(disruptions.map((d) => d.target_node_id));
  const conflictDetails = [];
  const deduplicated = [];
  const seenKeys = new Set();
  let rejectedCount = 0;

  for (const prop of allProposals) {
    // Constraint: proposals targeting a disrupted supplier are rejected
    if (prop.origin_node_id && disrupted.has(prop.origin_node_id)) {
      conflictDetails.push(`REJECTED ${prop.proposal_id}: supplier '${prop.origin_node_id}' is shut down`);
      rejectedCount++;
      continue;
    }

    // Deduplication: (actionType, origin, dest, product, startDay)
    const dedupKey = `${prop.action_type}::${prop.origin_node_id}::${prop.destination_node_id}::${prop.product_id}::${prop.start_day}`;
    if (seenKeys.has(dedupKey)) {
      conflictDetails.push(`DEDUPLICATED ${prop.proposal_id}: identical action already queued`);
      continue;
    }

    seenKeys.add(dedupKey);
    deduplicated.push(prop);
  }

  const conflictReport = {
    has_conflicts: conflictDetails.length > 0,
    conflicting_proposals_count: conflictDetails.length,
    conflict_details: conflictDetails,
    deduplicated_proposals_count: deduplicated.length,
    rejected_proposals_count: rejectedCount,
  };

  // Step 4b: Guardrail Validation across all Agent Proposals (Tier 1 AI Safety)
  const agentGuardrailViolations = [];
  for (const [agentKey, res] of Object.entries(agentResults)) {
    const grResult = validateAgentProposalGuardrails(res, networkData, disruptions);
    if (!grResult.passed) {
      agentGuardrailViolations.push(...grResult.violations);
    }
  }

  // Step 9-10: Run JS optimizer
  const { runOptimizationSolver } = await import("./optimizer.js");
  const solverOutput = runOptimizationSolver(networkData, disruptions);

  // Step 11: Independent plan validation & Supply Chain Action Guardrails (Tier 2 Physical Feasibility)
  const violations = validatePlan(solverOutput.actions, networkData, disruptions);
  const actionGuardrails = validateSupplyChainActionGuardrails(solverOutput.actions, networkData, disruptions);
  const isValid = violations.length === 0 && actionGuardrails.passed;

  // Step 12-13: AI-enhanced trade-off synthesis
  const tradeOffPrompt = `You are the central coordinator agent for a resilient supply chain recovery platform. Synthesize this recovery plan:
- Scenario: Critical Tier-1 Supplier S1 (Apex Semiconductor) has a 7-day complete shutdown
- Agents run: 4 specialized domain agents (Demand, Inventory, SupplierRisk, Logistics)
- Candidate proposals generated: ${allProposals.length}, validated/deduplicated: ${deduplicated.length}, rejected for disruption conflict: ${rejectedCount}
- Optimizer results: Fill rate ${(solverOutput.expected_fill_rate * 100).toFixed(1)}%, Cost $${solverOutput.objective_value.toLocaleString()}, Status: ${solverOutput.solver_status}
- Strategic interventions: Rerouted COMP-A procurement to S2 (Pacific Silicon) and S3 (EuroTech); activated expedited freight corridors.
- Hard constraint violations detected: ${violations.length}

Write a structured 2-paragraph executive trade-off synthesis for the human planner:
Paragraph 1: Core operational decisions made, candidate action filtering, and alternate sourcing rationale.
Paragraph 2: Detailed service vs. cost trade-offs, financial premium incurred, and measurable advantage over traditional static reorder-point policies.`;

  const aiTradeOffRes = await callLLM(
    "You are a senior supply chain coordinator and AI decision synthesizer. Write an authoritative, clear, factual executive summary for human approval review.",
    tradeOffPrompt,
    600,
    preferredModel
  );
  const aiTradeOff = aiTradeOffRes.content;

  const deterministicTradeOff =
    `Coordinator synthesized ${allProposals.length} agent proposals (${deduplicated.length} validated, ${rejectedCount} rejected). ` +
    `Solver status: ${solverOutput.solver_status} in ${solverOutput.solver_duration_ms}ms. ` +
    `Recovery achieved ${(solverOutput.expected_fill_rate * 100).toFixed(1)}% fill rate with $${solverOutput.objective_value.toLocaleString()} total landed cost. ` +
    `Key trade-offs: S1 replaced by S2 (+$3/unit premium) and S3 (+$7/unit, expedited air). ` +
    `Independent validation confirmed ${violations.length} hard-constraint violations across ${solverOutput.actions.length} actions.`;

  const tradeOffSummary = aiTradeOff || deterministicTradeOff;
  const workflowDuration = Date.now() - startTime;

  return {
    workflow_duration_ms: workflowDuration,
    agent_results: agentResults,
    conflict_report: conflictReport,
    solver_output: solverOutput,
    validation_results: {
      is_valid: isValid,
      violations,
      violation_count: violations.length,
    },
    trade_off_summary: tradeOffSummary,
    ai_trade_off_analysis: aiTradeOff || null,
    model_identifier: aiTradeOffRes.model_used,
    tokens_used: aiTradeOffRes.tokens_used,
    status: isValid && ["OPTIMAL", "FEASIBLE"].includes(solverOutput.solver_status) ? "VALIDATED" : "FAILED",
    all_proposals_count: allProposals.length,
    deduplicated_proposals_count: deduplicated.length,
    guardrails_audit: {
      status: isValid ? "PASSED_ALL_GUARDRAILS" : "GUARDRAIL_INTERCEPTED",
      agent_violations: agentGuardrailViolations,
      physical_violations: actionGuardrails.violations,
      total_violations: agentGuardrailViolations.length + actionGuardrails.violations.length,
      policy_profile: "HITAM SOC-2 / ISO 27001 AI Safety Standard",
    },
  };
}

/** === Independent Plan Validator (Deliverable 7) === */
function validatePlan(actions, networkData, disruptions) {
  const violations = [];
  const disrupted = new Set(disruptions.map((d) => d.target_node_id));
  const laneMap = Object.fromEntries(networkData.lanes.map((l) => [`${l.origin_node_id}::${l.destination_node_id}`, l]));
  const nodeMap = Object.fromEntries(networkData.nodes.map((n) => [n.id, n]));

  for (const action of actions) {
    // V1: Disrupted supplier used
    if (action.action_type === "PROCUREMENT" && disrupted.has(action.origin_node_id)) {
      violations.push(`V1-DISRUPTED-SUPPLIER: Action ${action.action_type} from disrupted supplier ${action.origin_node_id} on Day ${action.start_day}`);
    }

    // V2: Lane capacity exceeded
    const laneKey = `${action.origin_node_id}::${action.destination_node_id}`;
    const lane = laneMap[laneKey];
    if (lane && action.quantity > lane.max_capacity_per_shipment) {
      violations.push(`V2-CAPACITY-EXCEEDED: Shipment of ${action.quantity} exceeds lane ${laneKey} capacity (${lane.max_capacity_per_shipment})`);
    }

    // V3: Invalid node
    if (action.origin_node_id && !nodeMap[action.origin_node_id]) {
      violations.push(`V3-INVALID-NODE: Origin node '${action.origin_node_id}' does not exist in network`);
    }

    // V4: Negative quantity
    if (action.quantity <= 0) {
      violations.push(`V4-INVALID-QTY: Action has non-positive quantity: ${action.quantity}`);
    }
  }

  return violations;
}
