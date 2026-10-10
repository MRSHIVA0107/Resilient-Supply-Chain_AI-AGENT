"use client";

import React, { useState } from "react";
import {
  BrainCircuit,
  ShieldAlert,
  Package,
  Truck,
  Check,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Clock,
  Info,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Sliders,
  Layers,
  Sparkles,
  Bot,
  Zap,
} from "lucide-react";
import { AgentResult, CandidateProposal } from "@/types";

interface AgentsViewProps {
  agentResults: Record<string, AgentResult> | null;
  coordinatorResult?: any;
  onRunAgents: (model?: string) => void;
  isRunning: boolean;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  agentResults,
  coordinatorResult,
  onRunAgents,
  isRunning,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [inspectedProposal, setInspectedProposal] = useState<CandidateProposal | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("meta-llama/llama-3.3-70b-instruct");

  const agentConfig: Record<string, { label: string; icon: any; color: string; desc: string }> = {
    demand_agent: {
      label: "Demand Agent",
      icon: ShieldAlert,
      color: "#f59e0b",
      desc: "Quantifies customer demand exposure, service-sensitive priority orders, and downstream shortage timing.",
    },
    inventory_agent: {
      label: "Inventory Agent",
      icon: Package,
      color: "#38bdf8",
      desc: "Projects component buffers, detects Austin assembly bottlenecks, and balances work-in-progress stock.",
    },
    supplier_risk_agent: {
      label: "Supplier-Risk Agent",
      icon: AlertCircle,
      color: "#f43f5e",
      desc: "Assesses S1 outage, qualifies alternate sources S2 and S3, and verifies supplier capacities and price deltas.",
    },
    logistics_agent: {
      label: "Logistics Agent",
      icon: Truck,
      color: "#10b981",
      desc: "Evaluates transport network lanes, expediting lead times, air-freight options, and arrival feasibility.",
    },
  };

  // Compile observations and proposals based on tab
  const getDisplayData = () => {
    if (!agentResults) return { observations: [], proposals: [], totalTime: "< 1 ms", aiAnalysis: null, agentMeta: null };

    if (selectedAgent === "all") {
      const allObs = Object.values(agentResults).flatMap((r) => r.observations || []);
      const allProps = Object.values(agentResults).flatMap((r) => r.proposals || []);
      return {
        observations: allObs,
        proposals: allProps,
        totalTime: "~12 ms aggregate",
        aiAnalysis: coordinatorResult?.trade_off_summary || coordinatorResult?.ai_trade_off_analysis || Object.values(agentResults)[0]?.ai_analysis,
        agentMeta: {
          model: coordinatorResult?.model_identifier || "meta-llama/llama-3.3-70b-instruct",
          tokens: coordinatorResult?.tokens_used || null,
        },
      };
    }

    const res = agentResults[selectedAgent];
    if (!res) return { observations: [], proposals: [], totalTime: "< 1 ms", aiAnalysis: null, agentMeta: null };

    const formattedTime = res.execution_time_ms < 1 ? "< 1 ms" : `${res.execution_time_ms.toFixed(1)} ms`;
    return {
      observations: res.observations || [],
      proposals: res.proposals || [],
      totalTime: formattedTime,
      aiAnalysis: res.ai_analysis,
      agentMeta: {
        model: res.model_identifier || selectedModel,
        tokens: (res as any).tokens_used || null,
        assumptions: res.assumptions,
        warnings: res.warnings,
      },
    };
  };

  const { observations, proposals, totalTime, aiAnalysis, agentMeta } = getDisplayData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Header and Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
              Four Specialized Domain Agents Workspace
            </h2>
            <span className="badge badge-cyan">DELIVERABLE 2 & 3</span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Read-only, schema-bounded specialized analysis agents operating over the validated immutable scenario snapshot with OpenRouter AI reasoning.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* OpenRouter Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="input-field"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.75rem", maxWidth: "230px" }}
            aria-label="Select OpenRouter LLM Model"
          >
            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B (SOTA)</option>
            <option value="openai/gpt-4o-mini">OpenAI GPT-4o-mini</option>
            <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B (Fast)</option>
            <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
            <option value="mistralai/mistral-small-24b-instruct-2501">Mistral Small 24B</option>
          </select>

          <button
            onClick={() => onRunAgents(selectedModel)}
            disabled={isRunning}
            className="btn btn-primary"
            style={{ padding: "0.55rem 1.15rem" }}
            aria-label="Re-run all domain agents"
          >
            <BrainCircuit size={16} className={isRunning ? "animate-spin" : ""} />
            <span>{isRunning ? "Executing Agent Sandbox..." : "Run All 4 Agents with AI"}</span>
          </button>
        </div>
      </div>

      {/* Architectural Lineage Callout */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "0.8rem", color: "#e2e8f0", lineHeight: 1.5 }}>
          <strong style={{ color: "#fff", display: "block", marginBottom: "2px" }}>
            Architectural Lineage: Strategic Proposals vs. Operational Recovery Schedule
          </strong>
          The 4 domain agents formulate <strong>candidate proposals</strong> (buffer dispatches, alternate supplier shifts, and expedited lanes) to resolve immediate exposure. When synthesized, the <strong>Central Coordinator and mathematical optimizer</strong> expand these strategic recommendations into the complete multi-period recovery plan.
        </div>
      </div>

      {/* Agent Selection Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* All Agents Combined View Tab */}
        <div
          onClick={() => setSelectedAgent("all")}
          className={`glass-panel ${selectedAgent === "all" ? "glass-panel-active" : ""}`}
          style={{
            padding: "1.1rem",
            cursor: "pointer",
            borderLeft: "4px solid var(--accent-cyan)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Layers size={17} color="var(--accent-cyan)" />
              <strong style={{ fontSize: "0.9rem", color: "#fff" }}>All Agents Unified</strong>
            </div>
            {agentResults && <span className="badge badge-cyan">{proposals.length} PROPOSALS</span>}
          </div>
          <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.4 }}>
            Aggregated view of all domain observations, cross-functional findings, and strategic recovery proposals.
          </p>
        </div>

        {Object.entries(agentConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isSelected = selectedAgent === key;
          const result = agentResults ? agentResults[key] : null;
          const runtimeFormatted = result
            ? result.execution_time_ms < 1
              ? "< 1 ms"
              : `${result.execution_time_ms.toFixed(1)} ms`
            : null;

          return (
            <div
              key={key}
              onClick={() => setSelectedAgent(key)}
              className={`glass-panel ${isSelected ? "glass-panel-active" : ""}`}
              style={{
                padding: "1.1rem",
                cursor: "pointer",
                borderLeft: `4px solid ${cfg.color}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <Icon size={17} color={cfg.color} />
                  <strong style={{ fontSize: "0.9rem", color: "#fff" }}>{cfg.label}</strong>
                </div>
                {result ? (
                  <span className="badge badge-emerald">READY ({runtimeFormatted})</span>
                ) : (
                  <span className="badge badge-cyan">STANDBY</span>
                )}
              </div>
              <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.4 }}>
                {cfg.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Prominent OpenRouter AI Reasoning & Synthesis Panel */}
      {aiAnalysis && (
        <div
          className="glass-panel"
          style={{
            padding: "1.35rem 1.5rem",
            borderLeft: "4px solid var(--accent-cyan)",
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(15, 23, 42, 0.6))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={18} style={{ color: "var(--accent-cyan)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                {selectedAgent === "all" ? "Central Coordinator AI Executive Synthesis" : `${agentConfig[selectedAgent]?.label || "Agent"} AI Operational Reasoning`}
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge badge-cyan">{agentMeta?.model || selectedModel}</span>
              <span className="badge badge-emerald">OPENROUTER LIVE</span>
            </div>
          </div>

          <div style={{ fontSize: "0.86rem", color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Main Detail Area: Observations & Candidate Proposals */}
      {agentResults ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.5rem" }}>
          {/* Left Column: Domain Observations */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                  Agent Observations ({observations.length})
                </h3>
              </div>
              <span className="badge badge-cyan">Runtime: {totalTime}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxHeight: "680px", overflowY: "auto", paddingRight: "4px" }}>
              {observations.map((obs, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.84rem", color: "#fff" }}>
                      {obs.category} — {obs.entity_id}
                    </span>
                    <span
                      className={`badge ${
                        obs.severity === "CRITICAL"
                          ? "badge-rose"
                          : obs.severity === "HIGH"
                          ? "badge-amber"
                          : "badge-cyan"
                      }`}
                    >
                      {obs.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.79rem", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.45 }}>
                    {obs.description}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    <span>Evidence Reference: <code>{obs.evidence_ref}</code></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Candidate Action Proposals */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                Candidate Action Proposals ({proposals.length})
              </h3>
              <span style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                Click any proposal to inspect details
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxHeight: "680px", overflowY: "auto", paddingRight: "4px" }}>
              {proposals.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  No candidate proposals formulated for this specific domain.
                </p>
              ) : (
                proposals.map((prop) => (
                  <div
                    key={prop.proposal_id}
                    onClick={() => setInspectedProposal(prop)}
                    style={{
                      padding: "0.9rem 1rem",
                      borderRadius: "8px",
                      background: "rgba(6, 182, 212, 0.05)",
                      border: "1px solid rgba(6, 182, 212, 0.22)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span className="badge badge-cyan">{prop.action_type}</span>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                          {prop.proposal_id}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff" }}>
                        Qty: {prop.quantity} units
                      </span>
                    </div>

                    <div style={{ fontSize: "0.84rem", color: "#fff", fontWeight: 600, marginTop: "8px" }}>
                      {prop.origin_node_id ? `${prop.origin_node_id} → ` : ""}{prop.destination_node_id} ({prop.product_id})
                    </div>

                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.4 }}>
                      {prop.rationale}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", fontSize: "0.74rem" }}>
                      <span style={{ color: "var(--accent-amber)", fontWeight: 600 }}>
                        Est. Cost: ${prop.total_estimated_cost?.toLocaleString()} (${prop.estimated_unit_cost}/u)
                      </span>
                      <span style={{ color: "var(--accent-emerald)" }}>
                        Priority Score: {prop.priority_score}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-muted)" }}>
          <BrainCircuit size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.5, color: "var(--accent-cyan)" }} />
          <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
            AI Agent Sandbox Not Executed
          </h4>
          <p style={{ maxWidth: "460px", margin: "0 auto 1.25rem auto", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Trigger all 4 specialized domain agents (Demand, Inventory, Supplier-Risk, Logistics) to run in parallel with OpenRouter AI reasoning and formulate candidate recovery actions.
          </p>
          <button
            onClick={() => onRunAgents(selectedModel)}
            disabled={isRunning}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            <BrainCircuit size={16} />
            <span>{isRunning ? "Executing..." : "Execute 4 Specialized Agents"}</span>
          </button>
        </div>
      )}

      {/* Proposal Inspection Modal */}
      {inspectedProposal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
          onClick={() => setInspectedProposal(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "560px", width: "100%", padding: "1.75rem", background: "#0b1121" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge badge-cyan">{inspectedProposal.action_type}</span>
                <strong style={{ color: "#fff", fontSize: "1rem" }}>{inspectedProposal.proposal_id}</strong>
              </div>
              <button onClick={() => setInspectedProposal(null)} className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem" }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Formulating Agent: </span>
                <strong style={{ color: "#fff" }}>{inspectedProposal.agent_name}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Route: </span>
                <strong style={{ color: "#fff" }}>
                  {inspectedProposal.origin_node_id ? `${inspectedProposal.origin_node_id} → ` : ""}{inspectedProposal.destination_node_id}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Product & Quantity: </span>
                <strong style={{ color: "#fff" }}>{inspectedProposal.quantity} units of {inspectedProposal.product_id}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Timing Window: </span>
                <span style={{ color: "#e2e8f0" }}>Departure Day {inspectedProposal.start_day} → Arrival Day {inspectedProposal.delivery_day}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Estimated Landed Cost: </span>
                <strong style={{ color: "var(--accent-amber)" }}>${inspectedProposal.total_estimated_cost?.toLocaleString()} (${inspectedProposal.estimated_unit_cost}/unit)</strong>
              </div>
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Operational Rationale:</span>
                <p style={{ color: "#e2e8f0", lineHeight: 1.45 }}>{inspectedProposal.rationale}</p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Evidence Reference: </span>
                <code>{inspectedProposal.evidence_ref}</code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
