"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  TrendingDown,
  Clock,
  ShieldCheck,
  HelpCircle,
  ArrowUpDown,
  Filter,
  Info,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface ExposureRow {
  nodeId: string;
  nodeName: string;
  productId: string;
  productName: string;
  productType: "COMPONENT" | "FINISHED_GOOD";
  onHand: number;
  reserved: number;
  available: number;
  confirmedInbound: string;
  consumptionPerDay: string;
  stockoutDay: number;
  stockoutFormatted: string;
  exposureLevel: "CRITICAL RUNWAY" | "IMMEDIATE STOCKOUT" | "HIGH EXPOSURE" | "MODERATE";
  badgeClass: string;
  derivationFormula: string;
}

export const ExposureView: React.FC = () => {
  const [sortField, setSortField] = useState<keyof ExposureRow>("stockoutDay");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<"ALL" | "COMPONENTS" | "FINISHED_GOODS">("ALL");
  const [selectedRow, setSelectedRow] = useState<ExposureRow | null>(null);

  const rows: ExposureRow[] = [
    {
      nodeId: "Plant-1",
      nodeName: "Plant-1 (Austin Assembly)",
      productId: "COMP-A",
      productName: "COMP-A (Microcontroller SoC)",
      productType: "COMPONENT",
      onHand: 320,
      reserved: 40,
      available: 280,
      confirmedInbound: "+150 units (Arrives Day 2)",
      consumptionPerDay: "~120 units/day (Assembly)",
      stockoutDay: 3.5,
      stockoutFormatted: "Day 3.5",
      exposureLevel: "CRITICAL RUNWAY",
      badgeClass: "badge-rose",
      derivationFormula: "Available Buffer = 320 On-Hand − 40 Reserved = 280 units. Confirmed inbound of 150 units arrives on Day 2. Cumulative buffer of 430 units / ~120 units/day consumption rate = Day 3.58 depletion. S1 shutdown halts all new arrivals, creating catastrophic starvation without S2/S3 alternate POs.",
    },
    {
      nodeId: "Plant-1",
      nodeName: "Plant-1 (Austin Assembly)",
      productId: "COMP-B",
      productName: "COMP-B (Passive Pack)",
      productType: "COMPONENT",
      onHand: 800,
      reserved: 60,
      available: 740,
      confirmedInbound: "+200 units (Arrives Day 1)",
      consumptionPerDay: "~180 units/day (Assembly)",
      stockoutDay: 6.2,
      stockoutFormatted: "Day 6.2",
      exposureLevel: "MODERATE",
      badgeClass: "badge-amber",
      derivationFormula: "Available Buffer = 800 On-Hand − 60 Reserved = 740 units. Confirmed inbound of 200 units arrives on Day 1. Total available 940 units / ~180 units/day = 5.2 days of additional assembly burn. Starvation occurs around Day 6.2 if unreplenished.",
    },
    {
      nodeId: "DC-North",
      nodeName: "DC-North (Chicago)",
      productId: "PROD-1",
      productName: "PROD-1 (Tier-1 Gateway)",
      productType: "FINISHED_GOOD",
      onHand: 140,
      reserved: 30,
      available: 110,
      confirmedInbound: "0 units scheduled",
      consumptionPerDay: "~91 units/day (PROD-1 only)",
      stockoutDay: 2.3,
      stockoutFormatted: "Day 2.3",
      exposureLevel: "IMMEDIATE STOCKOUT",
      badgeClass: "badge-rose",
      derivationFormula: "Available Buffer = 140 On-Hand − 30 Reserved = 110 units. Daily PROD-1 customer demand averages 90.9 units/day (Day 1: 85, Day 2: 90). Without upstream plant replenishment, Chicago runs completely out of stock by Day 2.3, threatening Tier-1 mission-critical SLAs.",
    },
    {
      nodeId: "DC-South",
      nodeName: "DC-South (Dallas)",
      productId: "PROD-1",
      productName: "PROD-1 (Tier-1 Gateway)",
      productType: "FINISHED_GOOD",
      onHand: 120,
      reserved: 20,
      available: 100,
      confirmedInbound: "0 units scheduled",
      consumptionPerDay: "~70 units/day (PROD-1 only)",
      stockoutDay: 2.5,
      stockoutFormatted: "Day 2.5",
      exposureLevel: "IMMEDIATE STOCKOUT",
      badgeClass: "badge-rose",
      derivationFormula: "Available Buffer = 120 On-Hand − 20 Reserved = 100 units. Daily PROD-1 customer demand is 70.1 units/day. Dallas exhausts local stock by midday on Day 2.5 without urgent transport dispatch from Plant-1.",
    },
    {
      nodeId: "DC-West",
      nodeName: "DC-West (Ontario / LA)",
      productId: "PROD-1",
      productName: "PROD-1 (Tier-1 Gateway)",
      productType: "FINISHED_GOOD",
      onHand: 110,
      reserved: 20,
      available: 90,
      confirmedInbound: "0 units scheduled",
      consumptionPerDay: "~63 units/day (PROD-1 only)",
      stockoutDay: 2.8,
      stockoutFormatted: "Day 2.8",
      exposureLevel: "HIGH EXPOSURE",
      badgeClass: "badge-amber",
      derivationFormula: "Available Buffer = 110 On-Hand − 20 Reserved = 90 units. Daily PROD-1 customer demand averages 62.7 units/day. Complete stockout arrives at Day 2.8 without shipments from Plant-1 (2d transit) or Plant-2 (1d transit).",
    },
  ];

  const filteredRows = rows.filter((r) => {
    if (filterType === "COMPONENTS") return r.productType === "COMPONENT";
    if (filterType === "FINISHED_GOODS") return r.productType === "FINISHED_GOOD";
    return true;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return sortAsc
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (field: keyof ExposureRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Title & Operational Rationale */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
            Demand & Inventory Exposure Analysis
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Deterministic projection of component runouts, upstream assembly starvation points, and customer SLA demand exposure.
          </p>
        </div>

        {/* Filter Buttons */}
        <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <button
            onClick={() => setFilterType("ALL")}
            className={`nav-tab-btn ${filterType === "ALL" ? "active" : ""}`}
            style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
          >
            All Inventory ({rows.length})
          </button>
          <button
            onClick={() => setFilterType("COMPONENTS")}
            className={`nav-tab-btn ${filterType === "COMPONENTS" ? "active" : ""}`}
            style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
          >
            Components Only (2)
          </button>
          <button
            onClick={() => setFilterType("FINISHED_GOODS")}
            className={`nav-tab-btn ${filterType === "FINISHED_GOODS" ? "active" : ""}`}
            style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
          >
            Finished Goods (3)
          </button>
        </div>
      </div>

      {/* Verified Scenario KPI Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-label">
            <span>Critical Runway (Austin Plant-1)</span>
            <Clock size={16} color="#f43f5e" />
          </div>
          <div className="stat-value" style={{ color: "#f43f5e" }}>3.5 Days</div>
          <div className="stat-sub">COMP-A exhaustion without alternate POs</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-label">
            <span>Total Network Demand</span>
            <AlertCircle size={16} color="#f59e0b" />
          </div>
          <div className="stat-value" style={{ color: "#f59e0b" }}>5,391 Units</div>
          <div className="stat-sub">14-day total network volume (3,132 P1 / 2,259 P2)</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-label">
            <span>High-Priority Tier-1 Demand</span>
            <TrendingDown size={16} color="#38bdf8" />
          </div>
          <div className="stat-value" style={{ color: "#38bdf8" }}>1,597 Units</div>
          <div className="stat-sub">Mission-critical SLA orders (Days 1–7)</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-label">
            <span>Confirmed Inbound Receipts</span>
            <ShieldCheck size={16} color="#10b981" />
          </div>
          <div className="stat-value" style={{ color: "#10b981" }}>350 Units</div>
          <div className="stat-sub">150 COMP-A (D2) + 200 COMP-B (D1)</div>
        </div>
      </div>

      {/* Inventory Exposure Matrix */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
              Node-Level Inventory Exposure Matrix
            </h3>
            <span style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
              Available Buffer = On-Hand − Reserved Stock. Projections factor confirmed pipeline arrivals.
            </span>
          </div>

          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
            Click any row to inspect mathematical derivation
          </span>
        </div>

        <div className="table-wrapper">
          <table className="data-table" role="table">
            <thead>
              <tr>
                <th onClick={() => handleSort("nodeName")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Facility Node</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Product / Component</th>
                <th onClick={() => handleSort("onHand")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    <span>Starting On-Hand</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ textAlign: "right" }}>Reserved Stock</th>
                <th onClick={() => handleSort("available")} style={{ cursor: "pointer", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                    <span>Available Buffer</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Confirmed Inbounds</th>
                <th>Daily Consumption / Demand</th>
                <th onClick={() => handleSort("stockoutDay")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Projected Stockout</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Exposure Severity</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={`${row.nodeId}-${row.productId}`}
                  onClick={() => setSelectedRow(row)}
                  style={{ cursor: "pointer" }}
                >
                  <td><strong>{row.nodeName}</strong></td>
                  <td style={{ color: "#cbd5e1" }}>{row.productName}</td>
                  <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{row.onHand} units</td>
                  <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--text-dim)" }}>{row.reserved} units</td>
                  <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    {row.available} units
                  </td>
                  <td style={{ fontSize: "0.78rem", color: row.confirmedInbound.includes("+") ? "#34d399" : "var(--text-dim)" }}>
                    {row.confirmedInbound}
                  </td>
                  <td style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {row.consumptionPerDay}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: row.stockoutDay <= 2.5 ? "#f43f5e" : row.stockoutDay <= 3.5 ? "#f59e0b" : "#38bdf8",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {row.stockoutFormatted}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${row.badgeClass}`}>{row.exposureLevel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Derivation Drill-Down Modal / Drawer */}
      {selectedRow && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Info size={18} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                  Stockout Calculation & Derivation Audit
                </h4>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "#fff" }}>
                  {selectedRow.nodeName} — {selectedRow.productName}
                </strong>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px" }}>
                  <span className={`badge ${selectedRow.badgeClass}`}>{selectedRow.exposureLevel}</span>
                  <span className="badge badge-purple">Projected Exhaustion: {selectedRow.stockoutFormatted}</span>
                </div>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.75)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Starting On-Hand:</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{selectedRow.onHand} units</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Reserved Inventory:</span>
                  <span style={{ color: "var(--text-dim)" }}>− {selectedRow.reserved} units</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "4px" }}>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>Available Buffer:</span>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>{selectedRow.available} units</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Confirmed Inbound:</span>
                  <span style={{ color: "#34d399" }}>{selectedRow.confirmedInbound}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Burn / Consumption Rate:</span>
                  <span style={{ color: "#fff" }}>{selectedRow.consumptionPerDay}</span>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: "0.8rem", color: "#fff", display: "block", marginBottom: "4px" }}>
                  Mathematical Rationale:
                </strong>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {selectedRow.derivationFormula}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedRow(null)} className="btn btn-secondary" style={{ fontSize: "0.8rem" }}>
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Buffer Depletion Trajectory Chart (Diagnostic Runway Visualization) */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fff" }}>
          Projected Buffer Depletion Trajectory (Days 1–7 Without Alternate Intervention)
        </h3>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
          Simulated buffer runout curves showing day-by-day depletion. The 150-unit inbound for Plant-1 COMP-A cushions buffer through Day 3, after which exhaustion occurs.
        </p>

        {/* Micro Runway Timeline Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.75rem", textAlign: "center" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isPlantStarved = day >= 4;
            const isChicagoStarved = day >= 3;
            return (
              <div
                key={day}
                style={{
                  padding: "0.85rem 0.5rem",
                  borderRadius: "8px",
                  background: isPlantStarved ? "rgba(244, 63, 94, 0.12)" : "rgba(15, 23, 42, 0.6)",
                  border: isPlantStarved ? "1px solid rgba(244, 63, 94, 0.35)" : "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", display: "block" }}>
                  Day {day}
                </span>
                <strong style={{ fontSize: "0.95rem", color: isPlantStarved ? "#f43f5e" : "#38bdf8", display: "block", margin: "4px 0" }}>
                  {day === 1 ? "280u" : day === 2 ? "310u*" : day === 3 ? "190u" : day === 4 ? "0u (STARVED)" : "0u"}
                </strong>
                <span style={{ fontSize: "0.68rem", color: isPlantStarved ? "#fb7185" : "var(--text-muted)" }}>
                  {day === 2 ? "*+150 inbound" : day === 4 ? "Out of stock" : "Active burn"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
