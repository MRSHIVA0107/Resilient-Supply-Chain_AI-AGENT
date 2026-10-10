"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { AuditEvent } from "@/types";

interface AuditViewProps {
  auditEvents: AuditEvent[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const AuditView: React.FC<AuditViewProps> = ({ auditEvents, onRefresh, isLoading }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
            Immutable System Audit Trail
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Governance log of all AI agent runs, plan generations, planner approvals, and execution events.
          </p>
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Actor</th>
                <th>Event ID</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No audit records logged yet. Run agents or generate a plan to populate audit trail.
                  </td>
                </tr>
              ) : (
                auditEvents.map((ev) => {
                  const evType = ev.event_type || (ev as any).action || "EVENT";
                  const badgeClass = evType.includes("APPROVED") ? "badge-emerald"
                    : evType.includes("EXECUTED") ? "badge-cyan"
                    : evType.includes("REJECTED") ? "badge-rose"
                    : "badge-purple";
                  return (
                    <tr key={ev.id}>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-dim)" }}>
                        {new Date(ev.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{evType}</span>
                      </td>
                      <td><strong>{ev.entity_type || (ev as any).resource_type || "—"}</strong></td>
                      <td><code style={{ fontSize: "0.75rem" }}>{ev.entity_id || (ev as any).resource_id || "—"}</code></td>
                      <td>{ev.actor || (ev as any).user_id || "SYSTEM"}</td>
                      <td style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        {ev.id?.substring(0, 16) || "—"}
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.description || (ev as any).details || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
