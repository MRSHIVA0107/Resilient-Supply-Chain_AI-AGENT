"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { DisruptionBanner } from "@/components/DisruptionBanner";
import { TopologyView } from "@/components/TopologyView";
import { ExposureView } from "@/components/ExposureView";
import { AgentsView } from "@/components/AgentsView";
import { PlanView } from "@/components/PlanView";
import { WhatIfView } from "@/components/WhatIfView";
import { ExecutionView } from "@/components/ExecutionView";
import { BenchmarksView } from "@/components/BenchmarksView";
import { GovernanceView } from "@/components/GovernanceView";
import { GuardrailsView } from "@/components/GuardrailsView";
import { DataImportView } from "@/components/DataImportView";
import { AuditView } from "@/components/AuditView";
import { api } from "@/lib/api";
import {
  Activity,
  Cpu,
  BarChart3,
  AlertTriangle,
  Zap,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  Lock,
  Layers,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [systemHealth, setSystemHealth] = useState<string>("HEALTHY");
  const [scenario, setScenario] = useState<any>(null);

  // Agentic workflow state
  const [agentResult, setAgentResult] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [planApproval, setPlanApproval] = useState<any>(null);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningAgents, setIsRunningAgents] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const health = await api.getHealth();
      setSystemHealth(health.status || "HEALTHY");
      const scenarioData = await api.getScenario();
      setScenario(scenarioData);
      try {
        const audits = await api.getAuditEvents();
        setAuditEvents(Array.isArray(audits) ? audits : []);
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      setErrorMessage("Failed to initialize: " + (err.message || "Unknown error"));
      setSystemHealth("OFFLINE");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAgents = async (model?: string) => {
    setIsRunningAgents(true);
    setErrorMessage(null);
    try {
      const result = await api.runAgents({ model });
      setAgentResult(result);
      setActiveTab("agents");
      await api.logAuditEvent({
        event_type: "AGENTS_RUN",
        actor: "planner",
        description: `4 AI agents completed (${result.model_identifier || model || "OpenRouter"}). Fill rate: ${(
          result.solver_output?.expected_fill_rate * 100 || 0
        ).toFixed(1)}%`,
        entity_type: "Coordinator",
      });
      const audits = await api.getAuditEvents();
      setAuditEvents(Array.isArray(audits) ? audits : []);
    } catch (err: any) {
      setErrorMessage(err.message || "Agent run failed");
    } finally {
      setIsRunningAgents(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    setErrorMessage(null);
    try {
      const plan = await api.generatePlan();
      setCurrentPlan(plan);
      setPlanApproval(null);
      setActiveTab("plan");
      await api.logAuditEvent({
        event_type: "PLAN_GENERATED",
        actor: "optimizer",
        description: `Recovery plan generated. Status: ${plan.status}. Fill rate: ${(
          plan.expected_fill_rate * 100 || 0
        ).toFixed(1)}%. Cost: $${(plan.total_cost || 0).toLocaleString()}`,
        entity_type: "RecoveryPlan",
        entity_id: plan.plan_id,
      });
      const audits = await api.getAuditEvents();
      setAuditEvents(Array.isArray(audits) ? audits : []);
    } catch (err: any) {
      setErrorMessage(err.message || "Plan generation failed");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleApprovePlan = async (decision: string, comments: string) => {
    if (!currentPlan) return;
    setIsApproving(true);
    setErrorMessage(null);
    try {
      const result = await api.approvePlan(
        currentPlan.plan_id,
        currentPlan.plan_hash,
        decision,
        comments
      );
      setPlanApproval(result);
      const audits = await api.getAuditEvents();
      setAuditEvents(Array.isArray(audits) ? audits : []);
    } catch (err: any) {
      setErrorMessage(err.message || "Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  const handleExecutePlan = async () => {
    if (!currentPlan || planApproval?.decision !== "APPROVED") return;
    setIsExecuting(true);
    setErrorMessage(null);
    try {
      const exec = await api.executePlan(currentPlan);
      setExecutionResult(exec);
      setActiveTab("execution");
      const audits = await api.getAuditEvents();
      setAuditEvents(Array.isArray(audits) ? audits : []);
    } catch (err: any) {
      setErrorMessage(err.message || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    setErrorMessage(null);
    try {
      const bData = await api.runBenchmark();
      setBenchmarkData(bData);
      setActiveTab("benchmarks");
    } catch (err: any) {
      setErrorMessage(err.message || "Benchmark failed");
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  // Derive stats
  const fillRate = currentPlan?.expected_fill_rate ?? agentResult?.solver_output?.expected_fill_rate ?? null;
  const totalCost = currentPlan?.total_cost ?? agentResult?.solver_output?.objective_value ?? null;
  const planStatus = planApproval?.decision
    ? planApproval.decision
    : currentPlan?.status || "NOT_GENERATED";

  return (
    <div className="layout-root">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemHealth={systemHealth}
      />

      {/* Disruption Alert Banner */}
      <DisruptionBanner
        onViewExposure={() => setActiveTab("exposure")}
        onRunAgents={() => handleRunAgents()}
        isScenarioActive={Boolean(scenario?.scenario?.disruptions?.length)}
      />

      <main className="content-container">
        {errorMessage && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#fb7185",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              style={{ background: "transparent", border: "none", color: "#fb7185", cursor: "pointer", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Top Quick-Action Hero Bar */}
            <div
              className="glass-panel"
              style={{
                padding: "1.25rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.6))",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={18} style={{ color: "var(--accent-cyan)" }} />
                  <span style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>
                    ResilientChain Autonomous AI Recovery Suite
                  </span>
                  <span className="badge badge-cyan">OPENROUTER LIVE</span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "4px" }}>
                  Active Disruption: Apex Semiconductor (S1) 7-day shutdown. Multi-period 14-day network planning.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleRunAgents()}
                  disabled={isRunningAgents}
                  className="btn btn-primary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.9rem" }}
                >
                  <Cpu size={14} className={isRunningAgents ? "animate-spin" : ""} />
                  {isRunningAgents ? "Running AI Agents..." : "Run AI Agents (Deliverables 2 & 3)"}
                </button>
                <button
                  onClick={() => setActiveTab("whatif")}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.9rem" }}
                >
                  <TrendingUp size={14} style={{ color: "var(--accent-cyan)" }} />
                  What-If Workbench (Deliverable 5)
                </button>
                <button
                  onClick={handleRunBenchmark}
                  disabled={isRunningBenchmark}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.9rem" }}
                >
                  <BarChart3 size={14} style={{ color: "var(--accent-emerald)" }} />
                  {isRunningBenchmark ? "Simulating..." : "Fair Benchmarks (Deliverables 4 & 6)"}
                </button>
              </div>
            </div>

            {/* Top KPI Cards */}
            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <div className="stat-label">
                  <span>Network Demand Exposure</span>
                  <Activity size={16} color="var(--accent-amber)" />
                </div>
                <div className="stat-value" style={{ color: "var(--accent-amber)" }}>
                  3,850 Units
                </div>
                <div className="stat-sub">14-day aggregate across North, South & West DCs</div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-label">
                  <span>Expected Fill Rate</span>
                  <ShieldCheck size={16} color="#34d399" />
                </div>
                <div className="stat-value" style={{ color: fillRate != null && fillRate >= 0.95 ? "#34d399" : "var(--accent-cyan)" }}>
                  {fillRate != null ? `${(fillRate * 100).toFixed(1)}%` : "Pending Run"}
                </div>
                <div className="stat-sub">
                  {fillRate != null ? "Customer orders fulfilled on-time" : "Execute AI agents to calculate"}
                </div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-label">
                  <span>Total Landed Cost</span>
                  <Zap size={16} color="var(--accent-cyan)" />
                </div>
                <div className="stat-value" style={{ color: "var(--accent-cyan)" }}>
                  {totalCost != null
                    ? `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : "Pending Run"}
                </div>
                <div className="stat-sub">Procurement + freight + assembly + holding</div>
              </div>

              <div className="glass-panel stat-card">
                <div className="stat-label">
                  <span>Plan Approval State</span>
                  <Clock size={16} color="#a855f7" />
                </div>
                <div className="stat-value" style={{ fontSize: "1.15rem" }}>
                  <span className={`badge ${planStatus === "APPROVED" ? "badge-emerald" : planStatus === "REJECTED" ? "badge-rose" : "badge-purple"}`}>
                    {planStatus}
                  </span>
                </div>
                <div className="stat-sub">Human-in-the-loop authorization gate</div>
              </div>
            </div>

            {/* What-If Preview + Recovery Plan Summary Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
              {/* What-If Feature Highlight */}
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <TrendingUp size={18} style={{ color: "var(--accent-cyan)" }} />
                    Interactive What-If Scenario Analysis
                  </h3>
                  <button onClick={() => setActiveTab("whatif")} className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
                    Launch Workbench →
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.82rem" }}>
                  {[
                    { label: "S2 Capacity Constrained (−40%)", impact: "Triggers S3 spot air expedite, landed cost +14%", delta: "−12% fill", color: "amber" },
                    { label: "S3 Air Expedite Activated (2-day)", impact: "Accelerates recovery velocity by 2.0 days", delta: "+15% cost", color: "cyan" },
                    { label: "Demand Surge (+25% Spike)", impact: "Stress-tests assembly capacity at Austin Plant-1", delta: "−9% buffer", color: "rose" },
                    { label: "Both S2+S3 Agile Sourcing (Optimal)", impact: "Near-perfect 100% fill rate achieved with 0 violations", delta: "OPTIMAL", color: "emerald" },
                  ].map((sc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.65rem 0.85rem",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div>
                        <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{sc.label}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>{sc.impact}</div>
                      </div>
                      <span className={`delta-badge delta-${sc.color === "emerald" ? "beneficial" : sc.color === "rose" ? "critical" : "adverse"}`}>
                        {sc.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Plan Status */}
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck size={18} style={{ color: "var(--accent-emerald)" }} />
                  Recovery Plan Status
                </h3>
                {currentPlan ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Plan Identifier:</span>
                      <code style={{ color: "#94a3b8" }}>{currentPlan.plan_id}</code>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Solver Status:</span>
                      <span className="badge badge-emerald">{currentPlan.solver_status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Fill Rate:</span>
                      <strong style={{ color: "#34d399" }}>{((currentPlan.expected_fill_rate || 0) * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Total Cost:</span>
                      <strong style={{ color: "var(--accent-amber)" }}>${(currentPlan.total_cost || 0).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Planned Actions:</span>
                      <strong style={{ color: "#fff" }}>{currentPlan.actions?.length || 0} discrete actions</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-muted)" }}>Planner Approval:</span>
                      <span className={`badge ${planStatus === "APPROVED" ? "badge-emerald" : planStatus === "REJECTED" ? "badge-rose" : "badge-purple"}`}>
                        {planStatus}
                      </span>
                    </div>
                    <button onClick={() => setActiveTab("plan")} className="btn btn-secondary" style={{ marginTop: "0.5rem", fontSize: "0.78rem" }}>
                      View Plan & Authorize →
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                      No recovery plan generated yet. Run specialized agents or optimizer to formulate a verified recovery plan.
                    </p>
                    <button onClick={handleGeneratePlan} disabled={isGeneratingPlan} className="btn btn-primary" style={{ width: "100%", fontSize: "0.82rem" }}>
                      <Cpu size={14} /> Generate Recovery Plan →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Agent Status Cards (if agents have run) */}
            {agentResult && (
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "0.75rem" }}>
                  AI Agent Status — Last Run ({agentResult.model_identifier || "OpenRouter"})
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                  {Object.entries(agentResult.agent_results || {}).map(([agentKey, agent]: [string, any]) => (
                    <div key={agentKey} className="glass-panel" style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e2e8f0" }}>
                          {agent.agent_name || agentKey}
                        </span>
                        <span className={`badge ${agent.status === "SUCCESS" ? "badge-emerald" : "badge-rose"}`}>
                          {agent.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                        {agent.observations?.length || 0} observations • {agent.proposals?.length || 0} proposals
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {agent.execution_time_ms?.toFixed(0) || "?"}ms • {agent.model_identifier || "AI"}
                      </div>
                      {agent.ai_analysis && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
                          {agent.ai_analysis.substring(0, 120)}…
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TOPOLOGY */}
        {activeTab === "topology" && <TopologyView />}

        {/* TAB 3: EXPOSURE */}
        {activeTab === "exposure" && <ExposureView />}

        {/* TAB 4: SPECIALIZED AGENTS (Deliverables 2 & 3) */}
        {activeTab === "agents" && (
          <AgentsView
            agentResults={agentResult?.agent_results ?? null}
            coordinatorResult={agentResult}
            onRunAgents={handleRunAgents}
            isRunning={isRunningAgents}
          />
        )}

        {/* TAB 5: PLAN & APPROVAL (Deliverables 3 & 4) */}
        {activeTab === "plan" && (
          <PlanView
            plan={currentPlan}
            planApproval={planApproval}
            onGeneratePlan={handleGeneratePlan}
            onApprovePlan={handleApprovePlan}
            onExecutePlan={handleExecutePlan}
            isGenerating={isGeneratingPlan}
            isApproving={isApproving}
            isExecuting={isExecuting}
          />
        )}

        {/* TAB 6: WHAT-IF WORKBENCH (Deliverable 5) */}
        {activeTab === "whatif" && (
          <WhatIfView />
        )}

        {/* TAB 7: SIMULATOR EXECUTION (Deliverable 6) */}
        {activeTab === "execution" && (
          <ExecutionView
            executionResult={executionResult}
            onExecute={handleExecutePlan}
            isExecuting={isExecuting}
            canExecute={planApproval?.decision === "APPROVED"}
          />
        )}

        {/* TAB 8: FAIR BENCHMARKS (Deliverables 4 & 6) */}
        {activeTab === "benchmarks" && (
          <BenchmarksView
            benchmarkData={benchmarkData}
            onRunBenchmark={handleRunBenchmark}
            isRunning={isRunningBenchmark}
          />
        )}

        {/* TAB: GUARDRAILS & SAFETY MATRIX */}
        {activeTab === "guardrails" && (
          <GuardrailsView />
        )}

        {/* TAB 9: FAILURE & GOVERNANCE ANALYSIS (Deliverable 7) */}
        {activeTab === "governance" && (
          <GovernanceView
            currentPlan={currentPlan}
            planApproval={planApproval}
            auditEvents={auditEvents}
          />
        )}

        {/* TAB 10: DATA VALIDATION */}
        {activeTab === "import" && <DataImportView />}

        {/* TAB 11: AUDIT TRAIL */}
        {activeTab === "audit" && (
          <AuditView
            auditEvents={auditEvents}
            onRefresh={async () => {
              const a = await api.getAuditEvents();
              setAuditEvents(Array.isArray(a) ? a : []);
            }}
            isLoading={false}
          />
        )}
      </main>
    </div>
  );
}
