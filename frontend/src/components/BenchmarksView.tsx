"use client";

import React, { useState } from "react";
import {
  Scale,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { BenchmarkData } from "@/types";

interface BenchmarksViewProps {
  benchmarkData: BenchmarkData | null;
  onRunBenchmark: () => void;
  isRunning: boolean;
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({
  benchmarkData,
  onRunBenchmark,
  isRunning,
}) => {
  const [showCostBreakdown, setShowCostBreakdown] = useState<boolean>(false);

  // Helper to determine delta semantic tone
  const getDeltaTone = (metricName: string, deltaStr: string) => {
    const trimmed = deltaStr.trim().toLowerCase();

    if (metricName.includes("Runtime Latency")) {
      // In latency, higher latency is adverse overhead
      if (deltaStr.includes("+") && !deltaStr.includes("0.0")) {
        return {
          label: deltaStr,
          className: "delta-badge delta-adverse",
          subtext: "Minor reasoning overhead (+9.8 ms)",
        };
      }
      return { label: deltaStr, className: "delta-badge delta-neutral", subtext: "Equivalent latency" };
    }

    if (metricName.includes("Fill Rate")) {
      if (deltaStr.includes("+") && !deltaStr.includes("0.0")) {
        return { label: deltaStr, className: "delta-badge delta-beneficial", subtext: "Service improved" };
      }
      return { label: deltaStr, className: "delta-badge delta-neutral", subtext: "Equivalent (100% service)" };
    }

    if (metricName.includes("Backorder")) {
      if (deltaStr.includes("-")) {
        return { label: deltaStr, className: "delta-badge delta-beneficial", subtext: "Backorders reduced" };
      }
      return { label: deltaStr, className: "delta-badge delta-neutral", subtext: "Identical (0 backorders)" };
    }

    if (metricName.includes("Total Landed Cost")) {
      return { label: deltaStr, className: "delta-badge delta-neutral", subtext: "Identical mathematical cost" };
    }

    if (metricName.includes("Stability")) {
      return { label: "100% Consistent", className: "delta-badge delta-beneficial", subtext: "Deterministic solver" };
    }

    if (metricName.includes("Violation")) {
      return { label: "0.0%", className: "delta-badge delta-beneficial", subtext: "0 hard violations" };
    }

    return { label: deltaStr, className: "delta-badge delta-neutral", subtext: "Equivalent" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Header and Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
            Fair Multi-Approach Benchmark Comparison
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Deterministic side-by-side evaluation across 3 approaches under identical starting inventory, customer demand realizations, and the 7-day supplier outage.
          </p>
        </div>

        <button
          onClick={onRunBenchmark}
          disabled={isRunning}
          className="btn btn-primary"
          style={{ padding: "0.55rem 1.15rem" }}
        >
          <Scale size={16} className={isRunning ? "animate-spin" : ""} />
          <span>{isRunning ? "Simulating 3 Approaches..." : "Run Multi-Approach Benchmark"}</span>
        </button>
      </div>

      {benchmarkData ? (() => {
        // Support both new JS format (results.optimizer.kpis) and legacy format (comparison_table)
        const newFormat = benchmarkData.results;
        const winner = benchmarkData.winner;

        if (newFormat) {
          const approaches = [
            { key: "reorder_point", label: "Baseline 1: Reorder Point", color: "var(--accent-amber)" },
            { key: "optimizer", label: "Baseline 2: JS Optimizer", color: "var(--accent-blue)" },
            { key: "agent_assisted", label: "Approach 3: Agent-Assisted", color: "var(--accent-emerald)" },
          ] as const;

          const kpiRows = [
            { label: "Fill Rate", unit: "%", field: "fill_rate", higherBetter: true },
            { label: "Service Level", unit: "%", field: "service_level_pct", higherBetter: true },
            { label: "Backorders", unit: "units", field: "backorders", higherBetter: false },
            { label: "Total Landed Cost", unit: "USD", field: "total_landed_cost", higherBetter: false },
            { label: "Cost per Unit Served", unit: "USD/unit", field: "cost_per_unit_served", higherBetter: false },
            { label: "Recovery Time", unit: "days", field: "recovery_time_days", higherBetter: false },
            { label: "Inventory Days of Cover", unit: "days", field: "inventory_days_of_cover", higherBetter: true },
            { label: "Constraint Violations", unit: "count", field: "constraint_violations", higherBetter: false },
            { label: "Runtime Latency", unit: "ms", field: "runtime_ms", higherBetter: false },
            { label: "Recommendation Stability", unit: "0–1", field: "recommendation_stability", higherBetter: true },
          ];

          return (
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              {/* Winner banner */}
              {winner && (
                <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "rgba(16,185,129,0.1)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.25)", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>🏆 Recommended: {winner.overall?.toUpperCase().replace("_", " ")}</span>
                  <span style={{ color: "var(--text-muted)" }}>Best Fill Rate: <strong style={{ color: "#fff" }}>{winner.fill_rate?.replace("_", " ")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Lowest Cost: <strong style={{ color: "#fff" }}>{winner.cost?.replace("_", " ")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Fastest Recovery: <strong style={{ color: "#fff" }}>{winner.recovery?.replace("_", " ")}</strong></span>
                </div>
              )}

              {/* Approach summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {approaches.map(({ key, label, color }) => {
                  const res = newFormat[key];
                  if (!res) return null;
                  const g = res.grading;
                  return (
                    <div key={key} style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: `1px solid ${color}33` }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color, marginBottom: "0.5rem" }}>{label}</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 800, color: g.color === "emerald" ? "#34d399" : g.color === "rose" ? "#fb7185" : "#fbbf24" }}>{g.grade}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>{g.label}</div>
                      <div style={{ fontSize: "0.82rem", color: "#fff", fontWeight: 600 }}>{res.kpis.fill_rate.toFixed(1)}% fill rate</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>${res.kpis.total_landed_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })} cost</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{res.kpis.recovery_time_days}d recovery • {res.kpis.constraint_violations} violations</div>
                    </div>
                  );
                })}
              </div>

              {/* KPI Table */}
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>KPI Metric</th>
                      <th style={{ color: "var(--accent-amber)" }}>Reorder Point</th>
                      <th style={{ color: "var(--accent-blue)" }}>JS Optimizer</th>
                      <th style={{ color: "var(--accent-emerald)" }}>Agent-Assisted</th>
                      <th>Opt vs ROP Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiRows.map((row) => {
                      const rop = (newFormat.reorder_point?.kpis as any)?.[row.field];
                      const opt = (newFormat.optimizer?.kpis as any)?.[row.field];
                      const agent = (newFormat.agent_assisted?.kpis as any)?.[row.field];
                      const delta = opt != null && rop != null ? (opt as number) - (rop as number) : null;
                      const isBetter = delta != null && (row.higherBetter ? delta > 0 : delta < 0);
                      const isSame = delta != null && Math.abs(delta as number) < 0.01;
                      return (
                        <tr key={row.field}>
                          <td><strong>{row.label}</strong><span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)" }}>{row.unit}</span></td>
                          <td style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{typeof rop === "number" ? rop.toFixed(rop < 10 ? 2 : 0) : "—"}</td>
                          <td style={{ color: "#93c5fd", fontWeight: 600, fontFamily: "monospace" }}>{typeof opt === "number" ? opt.toFixed(opt < 10 ? 2 : 0) : "—"}</td>
                          <td style={{ color: "#34d399", fontWeight: 700, fontFamily: "monospace" }}>{typeof agent === "number" ? agent.toFixed(agent < 10 ? 2 : 0) : "—"}</td>
                          <td>
                            <span className={`delta-badge ${isSame ? "delta-neutral" : isBetter ? "delta-beneficial" : "delta-adverse"}`}>
                              {delta != null ? `${delta > 0 ? "+" : ""}${(delta as number).toFixed(Math.abs(delta as number) < 10 ? 1 : 0)}` : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Trade-off summary */}
              {newFormat.optimizer?.trade_off_summary && (
                <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "rgba(15,23,42,0.65)", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.55 }}>
                  <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>Optimizer Trade-Off Summary:</strong>
                  {newFormat.optimizer.trade_off_summary}
                </div>
              )}
            </div>
          );
        }

        // Legacy format fallback (comparison_table)
        return (
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>KPI Metric</th>
                    <th style={{ color: "var(--accent-amber)" }}>Reorder Point</th>
                    <th style={{ color: "var(--accent-blue)" }}>Optimization Only</th>
                    <th style={{ color: "var(--accent-emerald)" }}>Agent-Assisted</th>
                    <th>Agent vs Opt Delta</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkData.comparison_table?.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td><strong>{row.metric_name}</strong></td>
                      <td style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{row.reorder_point}</td>
                      <td style={{ color: "#93c5fd", fontWeight: 600, fontFamily: "monospace" }}>{row.optimization_only}</td>
                      <td style={{ color: "#34d399", fontWeight: 700, fontFamily: "monospace" }}>{row.agent_assisted}</td>
                      <td><span className="delta-badge delta-neutral">{row.agent_vs_opt_delta}</span></td>
                      <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })() : (
        <div className="glass-panel" style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-muted)" }}>
          <BarChart3 size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.5, color: "var(--accent-cyan)" }} />
          <h4 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
            No Benchmark Execution on Record
          </h4>
          <p style={{ maxWidth: "460px", margin: "0 auto 1.25rem auto", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Run the 3-approach benchmark to evaluate Reorder Point, JS Optimizer, and Agent-Assisted AI planning side by side with all 8 KPIs.
          </p>
          <button onClick={onRunBenchmark} disabled={isRunning} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
            <Scale size={16} />
            <span>{isRunning ? "Simulating..." : "Run Multi-Approach Benchmark"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

