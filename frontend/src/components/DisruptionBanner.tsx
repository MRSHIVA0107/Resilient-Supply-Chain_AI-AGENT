"use client";

import React, { useState } from "react";
import { AlertTriangle, Clock, RefreshCw, X, ShieldAlert, CheckCircle2, AlertOctagon } from "lucide-react";

interface DisruptionBannerProps {
  scenarioId?: string;
  scenarioVersion?: number;
  onReset?: () => Promise<void>;
  isResetting?: boolean;
  onViewExposure?: () => void;
  onRunAgents?: () => void | Promise<void>;
  isScenarioActive?: boolean;
}

export const DisruptionBanner: React.FC<DisruptionBannerProps> = ({
  scenarioId = "SCENARIO-DEMO-01",
  scenarioVersion = 1,
  onReset,
  isResetting = false,
  onViewExposure,
  onRunAgents,
  isScenarioActive = true,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resetSuccessBanner, setResetSuccessBanner] = useState(false);

  const handleConfirmReset = async () => {
    try {
      if (onReset) {
        await onReset();
      }
      setShowConfirmModal(false);
      setResetSuccessBanner(true);
      setTimeout(() => setResetSuccessBanner(false), 5000);
    } catch {
      // Error handled by parent component state
    }
  };

  return (
    <>
      <div className="disruption-banner" role="region" aria-label="Active Disruption Notification">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div
            style={{
              background: "rgba(244, 63, 94, 0.2)",
              padding: "10px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertOctagon size={24} color="#f43f5e" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontFamily: "ui-monospace, monospace",
                  padding: "2px 7px",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "4px",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                {scenarioId} (v{scenarioVersion}.0)
              </span>
              <h3 style={{ fontSize: "1.02rem", fontWeight: 700, color: "#fff" }}>
                CRITICAL DISRUPTION: 7-Day Supplier Outage Active
              </h3>
              <span className="badge badge-rose">100% SHUTDOWN</span>
              <span className="badge badge-amber">STATE: ACTIVE DISRUPTION</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.45 }}>
              Supplier <strong>Apex Semiconductor (S1)</strong> is completely unavailable from <strong>Day 1 through Day 7</strong>. Zero new component orders for <strong>COMP-A (Microcontroller SoC)</strong> can be initiated. Austin assembly buffer depletion is projected by Day 3.5.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "2px",
              fontSize: "0.78rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#e2e8f0", fontWeight: 600 }}>
              <Clock size={13} color="var(--accent-cyan)" />
              <span>Planning Horizon: 14 Days</span>
            </div>
            <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
              Outage Window: Days 1–7
            </span>
          </div>

          {onViewExposure && (
            <button
              onClick={onViewExposure}
              className="btn btn-secondary"
              style={{
                fontSize: "0.78rem",
                padding: "0.45rem 0.85rem",
              }}
            >
              <AlertTriangle size={13} color="#f59e0b" />
              <span>Exposure</span>
            </button>
          )}

          {onRunAgents && (
            <button
              onClick={() => onRunAgents()}
              className="btn btn-primary"
              style={{
                fontSize: "0.78rem",
                padding: "0.45rem 0.85rem",
              }}
            >
              <span>Run Agents</span>
            </button>
          )}

          {onReset && (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isResetting}
              className="btn btn-secondary"
              style={{
                fontSize: "0.78rem",
                padding: "0.45rem 0.85rem",
                background: "rgba(30, 41, 59, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
              }}
              aria-haspopup="dialog"
            >
              <RefreshCw size={13} className={isResetting ? "animate-spin" : ""} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Feedback */}
      {resetSuccessBanner && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: "8px",
            color: "#34d399",
            marginBottom: "1.25rem",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          role="status"
        >
          <CheckCircle2 size={16} />
          <span>Scenario state successfully reset to initial Day 1 conditions. Fresh baseline snapshot restored.</span>
        </div>
      )}

      {/* Confirmation Modal for Reset Scenario */}
      {showConfirmModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <h4 id="reset-modal-title" style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                  Confirm Scenario Reset
                </h4>
              </div>
              <button
                onClick={() => !isResetting && setShowConfirmModal(false)}
                disabled={isResetting}
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                Are you sure you want to reset <strong>{scenarioId}</strong> to its initial baseline condition?
              </p>
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>What will happen:</strong>
                <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <li>All generated recovery plans and approval records for this scenario will be cleared.</li>
                  <li>Specialized agent run outputs and candidate proposals will be purged.</li>
                  <li>Simulation logs, backorder traces, and uncommitted dispatches will be rolled back.</li>
                  <li>Initial inventory levels, confirmed inbounds, and the 7-day supplier outage will remain intact.</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isResetting}
                className="btn btn-secondary"
                style={{ fontSize: "0.82rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="btn btn-danger"
                style={{ fontSize: "0.82rem" }}
              >
                <RefreshCw size={14} className={isResetting ? "animate-spin" : ""} />
                <span>{isResetting ? "Resetting State..." : "Confirm & Reset Scenario"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
