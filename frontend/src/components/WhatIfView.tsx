"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  ArrowRight,
  Plane,
  Truck,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";

interface WhatIfViewProps {
  onSimulateComplete?: (result: any) => void;
}

export const WhatIfView: React.FC<WhatIfViewProps> = ({ onSimulateComplete }) => {
  // Scenario parameter state
  const [disruptionDays, setDisruptionDays] = useState<number>(7);
  const [disruptionSeverity, setDisruptionSeverity] = useState<number>(100);
  const [s2CapacityMult, setS2CapacityMult] = useState<number>(100);
  const [s3ExpediteEnabled, setS3ExpediteEnabled] = useState<boolean>(true);
  const [demandShockPercent, setDemandShockPercent] = useState<number>(0);
  const [transitDelayDays, setTransitDelayDays] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<string>("meta-llama/llama-3.3-70b-instruct");

  // Execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preset scenarios
  const applyPreset = (presetName: string) => {
    if (presetName === "baseline") {
      setDisruptionDays(7);
      setDisruptionSeverity(100);
      setS2CapacityMult(100);
      setS3ExpediteEnabled(true);
      setDemandShockPercent(0);
      setTransitDelayDays(0);
    } else if (presetName === "extended_outage") {
      setDisruptionDays(10);
      setDisruptionSeverity(100);
      setS2CapacityMult(100);
      setS3ExpediteEnabled(true);
      setDemandShockPercent(0);
      setTransitDelayDays(0);
    } else if (presetName === "demand_surge") {
      setDisruptionDays(7);
      setDisruptionSeverity(100);
      setS2CapacityMult(100);
      setS3ExpediteEnabled(true);
      setDemandShockPercent(25);
      setTransitDelayDays(0);
    } else if (presetName === "s2_bottleneck") {
      setDisruptionDays(7);
      setDisruptionSeverity(100);
      setS2CapacityMult(60);
      setS3ExpediteEnabled(true);
      setDemandShockPercent(0);
      setTransitDelayDays(1);
    } else if (presetName === "air_freight_disabled") {
      setDisruptionDays(7);
      setDisruptionSeverity(100);
      setS2CapacityMult(100);
      setS3ExpediteEnabled(false);
      setDemandShockPercent(0);
      setTransitDelayDays(0);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const payload = {
        disruption_days: disruptionDays,
        disruption_severity: disruptionSeverity / 100,
        s2_capacity_multiplier: s2CapacityMult / 100,
        s3_expedited_enabled: s3ExpediteEnabled,
        demand_shock_percent: demandShockPercent,
        transit_delay_days: transitDelayDays,
        preferred_model: selectedModel,
      };

      const result = await api.runWhatIf(payload);
      setSimResult(result);
      if (onSimulateComplete) onSimulateComplete(result);
    } catch (err: any) {
      setErrorMessage(err.message || "What-If simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
              What-If Scenario Simulation Workbench
            </h2>
            <span className="badge badge-cyan">DELIVERABLE 5</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Simulate parameter disruptions, capacity constraints, freight expediting, and demand shocks with OpenRouter AI trade-off analysis.
          </p>
        </div>

        {/* Model selector & action */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="input-field"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem", maxWidth: "230px" }}
            aria-label="Select AI Reasoning Model"
          >
            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B (SOTA)</option>
            <option value="openai/gpt-4o-mini">OpenAI GPT-4o-mini</option>
            <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B (Fast)</option>
            <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
            <option value="mistralai/mistral-small-24b-instruct-2501">Mistral Small 24B</option>
          </select>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="btn btn-primary"
            style={{ padding: "0.55rem 1.25rem" }}
          >
            <Play size={15} className={isSimulating ? "animate-spin" : ""} />
            <span>{isSimulating ? "Simulating AI & Solver..." : "Run What-If Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 600 }}>Quick Presets:</span>
        <button onClick={() => applyPreset("baseline")} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
          Apex 7-Day Shutdown (Baseline)
        </button>
        <button onClick={() => applyPreset("extended_outage")} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
          Extended 10-Day Outage
        </button>
        <button onClick={() => applyPreset("demand_surge")} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
          Demand Surge (+25%)
        </button>
        <button onClick={() => applyPreset("s2_bottleneck")} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
          S2 Bottleneck (−40% Cap, +1d Delay)
        </button>
        <button onClick={() => applyPreset("air_freight_disabled")} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
          Air Expedited Disabled
        </button>
      </div>

      {/* Interactive Parameter Controls */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <Sliders size={18} style={{ color: "var(--accent-cyan)" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
            Exploratory Parameter Adjustments
          </h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          {/* S1 Outage Duration */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>S1 Outage Duration:</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-amber)" }}>{disruptionDays} Days</span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              value={disruptionDays}
              onChange={(e) => setDisruptionDays(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "var(--accent-amber)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
              <span>1 Day</span>
              <span>7 Days (Default)</span>
              <span>14 Days (Full)</span>
            </div>
          </div>

          {/* S1 Outage Severity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>S1 Shutdown Severity:</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-rose)" }}>{disruptionSeverity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={disruptionSeverity}
              onChange={(e) => setDisruptionSeverity(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "var(--accent-rose)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
              <span>0% (Online)</span>
              <span>50% (Partial)</span>
              <span>100% (Offline)</span>
            </div>
          </div>

          {/* S2 Supplier Capacity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>S2 Alternate Capacity:</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-cyan)" }}>{s2CapacityMult}% ({Math.round(350 * s2CapacityMult / 100)} u/day)</span>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              step="10"
              value={s2CapacityMult}
              onChange={(e) => setS2CapacityMult(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
              <span>40% (Constrained)</span>
              <span>100% (Nominal)</span>
              <span>180% (Surge)</span>
            </div>
          </div>

          {/* Customer Demand Shock */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>Customer Demand Shock:</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: demandShockPercent >= 0 ? "#34d399" : "#fb7185" }}>
                {demandShockPercent > 0 ? `+${demandShockPercent}%` : `${demandShockPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="5"
              value={demandShockPercent}
              onChange={(e) => setDemandShockPercent(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "#34d399" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
              <span>−40% (Downturn)</span>
              <span>0% (Firm)</span>
              <span>+50% (Spike)</span>
            </div>
          </div>

          {/* Transit Delay Days */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>Corridor Transit Drift:</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#a855f7" }}>+{transitDelayDays} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="1"
              value={transitDelayDays}
              onChange={(e) => setTransitDelayDays(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "#a855f7" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
              <span>+0d (Normal)</span>
              <span>+1d (Congestion)</span>
              <span>+3d (Severe)</span>
            </div>
          </div>

          {/* S3 Expedited Toggle */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0", marginBottom: "8px" }}>
              S3 Air Freight Expediting:
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.85rem", color: "#cbd5e1" }}>
              <input
                type="checkbox"
                checked={s3ExpediteEnabled}
                onChange={(e) => setS3ExpediteEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--accent-cyan)", cursor: "pointer" }}
              />
              <span>{s3ExpediteEnabled ? "Enabled (2-day air freight available)" : "Disabled (Standard transit only)"}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#fb7185", fontSize: "0.85rem" }}>
          {errorMessage}
        </div>
      )}

      {/* Simulation Results Display */}
      {simResult ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Comparative KPI Cards (with Delta vs Baseline) */}
          <div className="stats-grid">
            {/* Fill Rate */}
            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Simulated Fill Rate</span>
                <CheckCircle2 size={16} color="#34d399" />
              </div>
              <div className="stat-value" style={{ color: simResult.metrics?.fill_rate >= 95 ? "#34d399" : simResult.metrics?.fill_rate >= 80 ? "var(--accent-amber)" : "#fb7185" }}>
                {simResult.metrics?.fill_rate?.toFixed(1)}%
              </div>
              <div className="stat-sub">
                Delta vs Baseline:{" "}
                <span className={`delta-badge ${simResult.deltas_vs_baseline?.fill_rate_delta >= 0 ? "delta-beneficial" : "delta-critical"}`}>
                  {simResult.deltas_vs_baseline?.fill_rate_delta >= 0 ? "+" : ""}
                  {simResult.deltas_vs_baseline?.fill_rate_delta?.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Total Landed Cost */}
            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Total Landed Cost</span>
                <DollarSign size={16} color="var(--accent-amber)" />
              </div>
              <div className="stat-value" style={{ color: "var(--accent-amber)" }}>
                ${simResult.metrics?.total_landed_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-sub">
                Delta vs Baseline:{" "}
                <span className={`delta-badge ${simResult.deltas_vs_baseline?.cost_delta <= 0 ? "delta-beneficial" : "delta-adverse"}`}>
                  {simResult.deltas_vs_baseline?.cost_delta >= 0 ? "+$" : "-$"}
                  {Math.abs(simResult.deltas_vs_baseline?.cost_delta || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* Backorders */}
            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Unmet Backorders</span>
                <AlertTriangle size={16} color={simResult.metrics?.backorders > 0 ? "#fb7185" : "#34d399"} />
              </div>
              <div className="stat-value" style={{ color: simResult.metrics?.backorders > 0 ? "#fb7185" : "#34d399" }}>
                {simResult.metrics?.backorders?.toFixed(0)} units
              </div>
              <div className="stat-sub">
                Delta:{" "}
                <span className={`delta-badge ${simResult.deltas_vs_baseline?.backorders_delta <= 0 ? "delta-beneficial" : "delta-critical"}`}>
                  {simResult.deltas_vs_baseline?.backorders_delta >= 0 ? "+" : ""}
                  {simResult.deltas_vs_baseline?.backorders_delta?.toFixed(0)} units
                </span>
              </div>
            </div>

            {/* AI Confidence & Risk Rating */}
            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>AI Confidence Score</span>
                <BrainCircuit size={16} color="var(--accent-cyan)" />
              </div>
              <div className="stat-value" style={{ color: "var(--accent-cyan)" }}>
                {simResult.ai_evaluation?.confidence_score}%
              </div>
              <div className="stat-sub">
                Risk Rating:{" "}
                <span className={`badge ${
                  simResult.ai_evaluation?.risk_rating === "CRITICAL"
                    ? "badge-rose"
                    : simResult.ai_evaluation?.risk_rating === "HIGH"
                    ? "badge-amber"
                    : simResult.ai_evaluation?.risk_rating === "LOW"
                    ? "badge-emerald"
                    : "badge-cyan"
                }`}>
                  {simResult.ai_evaluation?.risk_rating}
                </span>
              </div>
            </div>
          </div>

          {/* AI Scenario Rationale and Executive Briefing */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--accent-cyan)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={18} style={{ color: "var(--accent-cyan)" }} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                  OpenRouter AI Scenario Rationale & Causal Analysis
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge badge-cyan">{simResult.ai_evaluation?.model_used || selectedModel}</span>
                <span className="badge badge-emerald">CONFIDENCE: {simResult.ai_evaluation?.confidence_score}%</span>
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-line" }}>
              {simResult.ai_evaluation?.rationale}
            </div>
          </div>

          {/* Recommended Interventions & Action Plan */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={17} style={{ color: "var(--accent-emerald)" }} />
              Simulated Dispatch Actions ({simResult.coordinator_result?.solver_output?.actions?.length || 0} discrete actions)
            </h3>

            <div className="table-wrapper" style={{ maxHeight: "380px", overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Corridor / Node</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Schedule</th>
                    <th>Cost</th>
                    <th>Operational Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {simResult.coordinator_result?.solver_output?.actions?.slice(0, 15).map((a: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        <span className={`badge ${a.action_type === "PROCUREMENT" ? "badge-cyan" : a.action_type === "PRODUCTION" ? "badge-purple" : "badge-emerald"}`}>
                          {a.action_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#fff" }}>
                        {a.origin_node_id ? `${a.origin_node_id} → ${a.destination_node_id}` : a.destination_node_id}
                      </td>
                      <td><code>{a.product_id}</code></td>
                      <td style={{ fontWeight: 700, color: "#fff" }}>{a.quantity}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                        Day {a.start_day} → Day {a.delivery_day} {a.is_expedited ? "⚡" : ""}
                      </td>
                      <td style={{ fontFamily: "monospace", color: "var(--accent-amber)" }}>
                        ${a.estimated_cost?.toLocaleString()}
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {a.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-muted)" }}>
          <TrendingUp size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.5, color: "var(--accent-cyan)" }} />
          <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
            No What-If Simulation Active
          </h4>
          <p style={{ maxWidth: "480px", margin: "0 auto 1.25rem auto", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Adjust the sliders above (disruption days, alternate capacities, demand shock) and click "Run What-If Simulation" to generate AI confidence scores and service/cost trade-offs.
          </p>
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            <Play size={16} />
            <span>{isSimulating ? "Simulating..." : "Run What-If Simulation with AI"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
