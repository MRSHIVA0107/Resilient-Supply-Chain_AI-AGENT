"use client";

import React from "react";
import { PlayCircle, CheckCircle2, ShieldCheck, History, ArrowRight } from "lucide-react";

interface ExecutionViewProps {
  executionResult: any;
  onExecute: () => void;
  isExecuting: boolean;
  canExecute: boolean;
}

export const ExecutionView: React.FC<ExecutionViewProps> = ({
  executionResult,
  onExecute,
  isExecuting,
  canExecute,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
            Simulated Execution & Dispatch Engine
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Executes approved recovery actions in the discrete-event supply chain simulator with idempotency protection.
          </p>
        </div>

        {canExecute && (
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="btn btn-success"
          >
            <PlayCircle size={16} />
            <span>{isExecuting ? "Executing Actions..." : "Execute Approved Plan"}</span>
          </button>
        )}
      </div>

      {executionResult ? (
        <>
          <div className="stats-grid">
            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Execution Status</span>
                <CheckCircle2 size={16} color="#34d399" />
              </div>
              <div className="stat-value" style={{ color: "#34d399" }}>
                {executionResult.details?.status || "COMPLETED"}
              </div>
              <div className="stat-sub">Run ID: {executionResult.details?.execution_run_id}</div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Actions Dispatched</span>
                <History size={16} color="#38bdf8" />
              </div>
              <div className="stat-value" style={{ color: "#38bdf8" }}>
                {executionResult.details?.actions_executed || 0}
              </div>
              <div className="stat-sub">100% successful simulated dispatch</div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Simulated Fill Rate</span>
                <ShieldCheck size={16} color="#34d399" />
              </div>
              <div className="stat-value" style={{ color: "#34d399" }}>
                {executionResult.details?.simulation_metrics
                  ? `${(executionResult.details.simulation_metrics.fill_rate * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <div className="stat-sub">Units Served On-Time</div>
            </div>

            <div className="glass-panel stat-card">
              <div className="stat-label">
                <span>Total Realized Cost</span>
                <CheckCircle2 size={16} color="#f59e0b" />
              </div>
              <div className="stat-value" style={{ color: "#f59e0b" }}>
                ${executionResult.details?.simulation_metrics?.total_cost?.toLocaleString() || "0"}
              </div>
              <div className="stat-sub">Simulated landed cost total</div>
            </div>
          </div>

          {/* Daily Trajectory Table */}
          {executionResult.details?.simulation_metrics?.daily_records && (
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>
                Daily Simulation Roll-Forward Trajectory (Days 1–14)
              </h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Total Daily Demand</th>
                      <th>Units Fulfilled</th>
                      <th>Backorders</th>
                      <th>DC-North Stock (PROD-1)</th>
                      <th>DC-South Stock (PROD-1)</th>
                      <th>DC-West Stock (PROD-1)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executionResult.details.simulation_metrics.daily_records.map((rec: any) => (
                      <tr key={rec.day}>
                        <td><strong>Day {rec.day}</strong></td>
                        <td>{rec.demand} units</td>
                        <td style={{ color: "#34d399", fontWeight: 600 }}>{rec.fulfilled} units</td>
                        <td style={{ color: rec.backorders > 0 ? "#f43f5e" : "var(--text-muted)" }}>
                          {rec.backorders} units
                        </td>
                        <td>{rec.dc_stock_snapshot["DC-North_PROD-1"] || 0}</td>
                        <td>{rec.dc_stock_snapshot["DC-South_PROD-1"] || 0}</td>
                        <td>{rec.dc_stock_snapshot["DC-West_PROD-1"] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <PlayCircle size={48} style={{ margin: "0 auto 1rem auto", opacity: 0.5 }} />
          <p>
            {canExecute
              ? "Plan is APPROVED and ready for simulated execution. Click 'Execute Approved Plan' above."
              : "Plan must be created and APPROVED by a planner before simulated dispatch."}
          </p>
        </div>
      )}
    </div>
  );
};
