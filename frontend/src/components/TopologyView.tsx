"use client";

import React, { useState } from "react";
import {
  Factory,
  Warehouse,
  AlertOctagon,
  CheckCircle2,
  Zap,
  ArrowRight,
  Filter,
  Info,
  X,
  Layers,
  Table as TableIcon,
  ShieldAlert,
  Truck,
  TrendingUp,
} from "lucide-react";

interface NodeData {
  id: string;
  name: string;
  echelon: 1 | 2 | 3;
  type: string;
  status: "OUTAGE" | "ACTIVE_ALTERNATE" | "EXPEDITED_BACKUP" | "NORMAL" | "WARNING" | "CRITICAL";
  badge: string;
  badgeClass: string;
  capacity: string;
  leadTime: string;
  costInfo: string;
  bufferOrDemand: string;
  demandScopeNote: string;
  description: string;
}

interface LaneData {
  id: string;
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;
  material: string;
  status: "DISRUPTED" | "ALTERNATE" | "EXPEDITED" | "NORMAL";
  leadTime: string;
  cost: string;
  capacity: string;
  isRecoveryRoute: boolean;
}

export const TopologyView: React.FC = () => {
  const [filter, setFilter] = useState<"ALL" | "DISRUPTED" | "RECOVERY">("ALL");
  const [viewMode, setViewMode] = useState<"DIAGRAM" | "TABLE">("DIAGRAM");
  const [selectedEntity, setSelectedEntity] = useState<{ type: "NODE" | "LANE"; data: any } | null>({
    type: "NODE",
    data: {
      id: "S1",
      name: "S1: Apex Semiconductor",
      echelon: 1,
      type: "Primary Component Supplier",
      status: "OUTAGE",
      badge: "OUTAGE (DAYS 1–7)",
      badgeClass: "badge-rose",
      capacity: "450 units/day (Normal)",
      leadTime: "3 days standard",
      costInfo: "COMP-A: $25/u | COMP-B: $5/u",
      bufferOrDemand: "0 orders accepted D1-D7",
      demandScopeNote: "Single-source vulnerability for Microcontroller SoC",
      description: "Primary manufacturing fab halted by critical wafer-fab contamination. All Purchase Orders rejected from Day 1 to Day 7. Upstream buffer at Austin Assembly exhausts by Day 3.5 without alternate routing.",
    },
  });

  const nodes: NodeData[] = [
    // ECHELON 1
    {
      id: "S1",
      name: "S1: Apex Semiconductor",
      echelon: 1,
      type: "Primary Component Supplier",
      status: "OUTAGE",
      badge: "OUTAGE (DAYS 1–7)",
      badgeClass: "badge-rose",
      capacity: "450 units/day (Normal)",
      leadTime: "3 days standard",
      costInfo: "COMP-A: $25.00/u | COMP-B: $5.00/u",
      bufferOrDemand: "0 orders accepted D1-D7",
      demandScopeNote: "Primary supplier for COMP-A SoC",
      description: "Primary manufacturing fab halted by critical equipment outage. Zero POs accepted across Days 1–7.",
    },
    {
      id: "S2",
      name: "S2: Pacific Silicon",
      echelon: 1,
      type: "Approved Alternate Supplier",
      status: "ACTIVE_ALTERNATE",
      badge: "APPROVED ALTERNATE",
      badgeClass: "badge-cyan",
      capacity: "350 units/day (COMP-A: 220, COMP-B: 350)",
      leadTime: "2 days standard",
      costInfo: "COMP-A: $32.00/u | COMP-B: $6.50/u",
      bufferOrDemand: "Available to ramp from Day 1",
      demandScopeNote: "Qualified secondary supplier with +$7/u price delta",
      description: "Fully pre-qualified secondary supplier capable of absorbing 220 units/day of COMP-A with rapid 2-day fulfillment.",
    },
    {
      id: "S3",
      name: "S3: EuroTech Electronics",
      echelon: 1,
      type: "Expedited Backup Supplier",
      status: "EXPEDITED_BACKUP",
      badge: "EXPEDITED BACKUP",
      badgeClass: "badge-emerald",
      capacity: "200 units/day (COMP-A)",
      leadTime: "2d ground / 1d air-freight",
      costInfo: "COMP-A: $42.00/u (Air freight premium)",
      bufferOrDemand: "Fast-track air dispatch available",
      demandScopeNote: "High-cost emergency buffer protection",
      description: "Specialized European distributor offering air-freight fulfillment to avert plant starvation when S2 capacity is saturated.",
    },

    // ECHELON 2
    {
      id: "Plant-1",
      name: "Plant-1: Austin Assembly",
      echelon: 2,
      type: "Central Manufacturing Node",
      status: "WARNING",
      badge: "CRITICAL BUFFER: 3.5 DAYS",
      badgeClass: "badge-amber",
      capacity: "600 finished units/day",
      leadTime: "Assembly: same-day conversion",
      costInfo: "Assembly cost: $10.00/unit",
      bufferOrDemand: "COMP-A: 280 avail + 150 D2 inbound = Day 3.5 stockout",
      demandScopeNote: "Assembles PROD-1 (Tier-1 Gateway) & PROD-2 (IoT Node)",
      description: "Central manufacturing hub for Tier-1 customer contracts. Highly sensitive to COMP-A starvation without prompt alternate supply.",
    },
    {
      id: "Plant-2",
      name: "Plant-2: Reno Regional",
      echelon: 2,
      type: "Secondary Manufacturing Node",
      status: "NORMAL",
      badge: "CAPACITY: 300 U/DAY",
      badgeClass: "badge-cyan",
      capacity: "300 finished units/day",
      leadTime: "Assembly: same-day conversion",
      costInfo: "Assembly cost: $10.00/unit",
      bufferOrDemand: "COMP-A: 80 avail (lower volume)",
      demandScopeNote: "Serves Western & Southern fulfillment centers",
      description: "Regional assembly plant providing buffer capacity and alternative freight lanes to DC-West and DC-South.",
    },

    // ECHELON 3
    {
      id: "DC-North",
      name: "DC-North (Chicago)",
      echelon: 3,
      type: "Tier-1 Distribution Center",
      status: "CRITICAL",
      badge: "IMMEDIATE STOCKOUT (DAY 2.3)",
      badgeClass: "badge-rose",
      capacity: "Throughput: 400 units/day",
      leadTime: "1-day transit from Austin",
      costInfo: "Freight: $6.00/u ground, $18.00/u expedited",
      bufferOrDemand: "Available: 110 PROD-1 | Demand: 91 u/day",
      demandScopeNote: "All Products Total: ~152 u/day (PROD-1: 91, PROD-2: 61)",
      description: "Houses Tier-1 mission-critical customer SLAs. Local available stock depletes in 2.3 days without priority inbound dispatches.",
    },
    {
      id: "DC-South",
      name: "DC-South (Dallas)",
      echelon: 3,
      type: "Regional Distribution Center",
      status: "CRITICAL",
      badge: "STOCKOUT PROJECTED (DAY 2.5)",
      badgeClass: "badge-rose",
      capacity: "Throughput: 350 units/day",
      leadTime: "1d from Austin, 2d from Reno",
      costInfo: "Freight: $4.00/u ground from Plant-1",
      bufferOrDemand: "Available: 100 PROD-1 | Demand: 70 u/day",
      demandScopeNote: "All Products Total: ~121 u/day (PROD-1: 70, PROD-2: 51)",
      description: "Fulfillment center for South region enterprise accounts. Vulnerable to stockout on Day 2.5 without replenishment.",
    },
    {
      id: "DC-West",
      name: "DC-West (Ontario / LA)",
      echelon: 3,
      type: "Pacific Distribution Center",
      status: "WARNING",
      badge: "HIGH EXPOSURE (DAY 2.8)",
      badgeClass: "badge-amber",
      capacity: "Throughput: 300 units/day",
      leadTime: "2d from Austin, 1d from Reno",
      costInfo: "Freight: $9.00/u from Austin, $5.00/u from Reno",
      bufferOrDemand: "Available: 90 PROD-1 | Demand: 63 u/day",
      demandScopeNote: "All Products Total: ~112 u/day (PROD-1: 63, PROD-2: 49)",
      description: "Pacific distribution hub. Can receive expedited 1-day shipments from Plant-2 or standard 2-day shipments from Plant-1.",
    },
  ];

  const lanes: LaneData[] = [
    {
      id: "L-S1-P1",
      origin: "S1",
      destination: "Plant-1",
      originName: "Apex S1",
      destinationName: "Austin Plant-1",
      material: "COMP-A, COMP-B",
      status: "DISRUPTED",
      leadTime: "3 days (BLOCKED)",
      cost: "$2.00/unit",
      capacity: "0 units/day (Shutdown)",
      isRecoveryRoute: false,
    },
    {
      id: "L-S2-P1",
      origin: "S2",
      destination: "Plant-1",
      originName: "Pacific S2",
      destinationName: "Austin Plant-1",
      material: "COMP-A, COMP-B",
      status: "ALTERNATE",
      leadTime: "2 days standard",
      cost: "$3.00/unit",
      capacity: "300 units/day",
      isRecoveryRoute: true,
    },
    {
      id: "L-S2-P2",
      origin: "S2",
      destination: "Plant-2",
      originName: "Pacific S2",
      destinationName: "Reno Plant-2",
      material: "COMP-A, COMP-B",
      status: "NORMAL",
      leadTime: "2 days standard",
      cost: "$2.50/unit",
      capacity: "200 units/day",
      isRecoveryRoute: false,
    },
    {
      id: "L-S3-P1",
      origin: "S3",
      destination: "Plant-1",
      originName: "EuroTech S3",
      destinationName: "Austin Plant-1",
      material: "COMP-A (Air Freight)",
      status: "EXPEDITED",
      leadTime: "1 day expedited air",
      cost: "$12.00/unit",
      capacity: "250 units/day",
      isRecoveryRoute: true,
    },
    {
      id: "L-P1-DCN",
      origin: "Plant-1",
      destination: "DC-North",
      originName: "Austin Plant-1",
      destinationName: "Chicago DC-North",
      material: "PROD-1, PROD-2",
      status: "EXPEDITED",
      leadTime: "1 day express ground",
      cost: "$18.00/unit (Priority)",
      capacity: "350 units/day",
      isRecoveryRoute: true,
    },
    {
      id: "L-P1-DCS",
      origin: "Plant-1",
      destination: "DC-South",
      originName: "Austin Plant-1",
      destinationName: "Dallas DC-South",
      material: "PROD-1, PROD-2",
      status: "NORMAL",
      leadTime: "1 day ground",
      cost: "$4.00/unit",
      capacity: "350 units/day",
      isRecoveryRoute: true,
    },
    {
      id: "L-P1-DCW",
      origin: "Plant-1",
      destination: "DC-West",
      originName: "Austin Plant-1",
      destinationName: "Ontario DC-West",
      material: "PROD-1, PROD-2",
      status: "NORMAL",
      leadTime: "2 days ground",
      cost: "$9.00/unit",
      capacity: "250 units/day",
      isRecoveryRoute: true,
    },
    {
      id: "L-P2-DCW",
      origin: "Plant-2",
      destination: "DC-West",
      originName: "Reno Plant-2",
      destinationName: "Ontario DC-West",
      material: "PROD-1, PROD-2",
      status: "NORMAL",
      leadTime: "1 day ground",
      cost: "$5.00/unit",
      capacity: "200 units/day",
      isRecoveryRoute: true,
    },
    {
      id: "L-P2-DCS",
      origin: "Plant-2",
      destination: "DC-South",
      originName: "Reno Plant-2",
      destinationName: "Dallas DC-South",
      material: "PROD-1, PROD-2",
      status: "NORMAL",
      leadTime: "2 days ground",
      cost: "$8.00/unit",
      capacity: "150 units/day",
      isRecoveryRoute: false,
    },
  ];

  const filteredLanes = lanes.filter((lane) => {
    if (filter === "DISRUPTED") return lane.status === "DISRUPTED";
    if (filter === "RECOVERY") return lane.isRecoveryRoute;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Header and Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
            Three-Echelon Supply Network Topology
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Directed architectural representation connecting component suppliers, assembly nodes, and downstream fulfillment centers.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Route Filter Buttons */}
          <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <button
              onClick={() => setFilter("ALL")}
              className={`nav-tab-btn ${filter === "ALL" ? "active" : ""}`}
              style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
            >
              All Lanes ({lanes.length})
            </button>
            <button
              onClick={() => setFilter("DISRUPTED")}
              className={`nav-tab-btn ${filter === "DISRUPTED" ? "active" : ""}`}
              style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
            >
              Disrupted Paths (1)
            </button>
            <button
              onClick={() => setFilter("RECOVERY")}
              className={`nav-tab-btn ${filter === "RECOVERY" ? "active" : ""}`}
              style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
            >
              Recovery Routes ({lanes.filter((l) => l.isRecoveryRoute).length})
            </button>
          </div>

          {/* Diagram / Table View Toggle */}
          <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <button
              onClick={() => setViewMode("DIAGRAM")}
              className={`nav-tab-btn ${viewMode === "DIAGRAM" ? "active" : ""}`}
              style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
              aria-label="View network diagram"
            >
              <Layers size={14} />
              <span>Network Graph</span>
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`nav-tab-btn ${viewMode === "TABLE" ? "active" : ""}`}
              style={{ fontSize: "0.76rem", padding: "0.35rem 0.65rem" }}
              aria-label="View data table"
            >
              <TableIcon size={14} />
              <span>Accessible Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "DIAGRAM" ? (
        <div style={{ display: "grid", gridTemplateColumns: selectedEntity ? "1fr 340px" : "1fr", gap: "1.5rem" }}>
          {/* Network Visualization Container */}
          <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
            {/* Echelon Column Headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem", marginBottom: "1.5rem" }}>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span className="badge badge-purple" style={{ marginBottom: "4px" }}>ECHELON 1</span>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>Component Suppliers</h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Raw SoC & Passive suppliers</span>
              </div>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span className="badge badge-cyan" style={{ marginBottom: "4px" }}>ECHELON 2</span>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>Assembly Plants</h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Conversion & BOM assembly</span>
              </div>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span className="badge badge-emerald" style={{ marginBottom: "4px" }}>ECHELON 3</span>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>Distribution Centers</h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Tier-1 customer fulfillment</span>
              </div>
            </div>

            {/* 3-Column Node Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem", position: "relative" }}>
              {/* ECHELON 1: SUPPLIERS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {nodes.filter((n) => n.echelon === 1).map((node) => {
                  const isSelected = selectedEntity?.data.id === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedEntity({ type: "NODE", data: node })}
                      className={`node-card ${isSelected ? "selected" : ""}`}
                      style={{
                        borderColor: node.status === "OUTAGE" ? "rgba(244, 63, 94, 0.45)" : isSelected ? "var(--accent-cyan)" : "var(--border-color)",
                        background: node.status === "OUTAGE" ? "rgba(244, 63, 94, 0.08)" : "rgba(15, 23, 42, 0.65)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          {node.status === "OUTAGE" ? <AlertOctagon size={16} color="#f43f5e" /> : <CheckCircle2 size={16} color="var(--accent-cyan)" />}
                          <strong style={{ fontSize: "0.88rem", color: "#fff" }}>{node.name}</strong>
                        </div>
                        <span className={`badge ${node.badgeClass}`}>{node.badge}</span>
                      </div>
                      <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        {node.costInfo}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        <span>Cap: {node.capacity.split("(")[0]}</span>
                        <span style={{ color: "var(--accent-cyan)" }}>LT: {node.leadTime}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ECHELON 2: ASSEMBLY PLANTS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {nodes.filter((n) => n.echelon === 2).map((node) => {
                  const isSelected = selectedEntity?.data.id === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedEntity({ type: "NODE", data: node })}
                      className={`node-card ${isSelected ? "selected" : ""}`}
                      style={{
                        borderColor: isSelected ? "var(--accent-cyan)" : "var(--border-color)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          <Factory size={16} color="var(--accent-cyan)" />
                          <strong style={{ fontSize: "0.88rem", color: "#fff" }}>{node.name}</strong>
                        </div>
                        <span className={`badge ${node.badgeClass}`}>{node.badge}</span>
                      </div>
                      <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        {node.capacity}
                      </p>
                      <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        {node.bufferOrDemand}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ECHELON 3: DISTRIBUTION CENTERS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {nodes.filter((n) => n.echelon === 3).map((node) => {
                  const isSelected = selectedEntity?.data.id === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedEntity({ type: "NODE", data: node })}
                      className={`node-card ${isSelected ? "selected" : ""}`}
                      style={{
                        borderColor: isSelected ? "var(--accent-cyan)" : "var(--border-color)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          <Warehouse size={16} color="var(--accent-emerald)" />
                          <strong style={{ fontSize: "0.88rem", color: "#fff" }}>{node.name}</strong>
                        </div>
                        <span className={`badge ${node.badgeClass}`}>{node.badge}</span>
                      </div>
                      <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        {node.demandScopeNote}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        <span>{node.bufferOrDemand.split("|")[0]}</span>
                        <span style={{ color: "var(--accent-amber)" }}>{node.bufferOrDemand.split("|")[1]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Directed Network Lane Flow Table / Badges */}
            <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
                <strong style={{ fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Truck size={15} color="var(--accent-cyan)" />
                  <span>Modeled Transport Lanes ({filteredLanes.length} Active in Filter)</span>
                </strong>
                <span style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>Click lane to inspect operational route parameters</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                {filteredLanes.map((lane) => {
                  const isSelected = selectedEntity?.data.id === lane.id;
                  return (
                    <div
                      key={lane.id}
                      onClick={() => setSelectedEntity({ type: "LANE", data: lane })}
                      style={{
                        padding: "0.75rem 0.9rem",
                        borderRadius: "8px",
                        background: lane.status === "DISRUPTED" ? "rgba(244, 63, 94, 0.08)" : isSelected ? "rgba(6, 182, 212, 0.12)" : "rgba(30, 41, 59, 0.45)",
                        border: isSelected ? "1px solid var(--accent-cyan)" : lane.status === "DISRUPTED" ? "1px dashed rgba(244, 63, 94, 0.5)" : "1px solid var(--border-color)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>
                          <span>{lane.originName}</span>
                          <ArrowRight size={13} color="var(--text-muted)" />
                          <span>{lane.destinationName}</span>
                        </div>
                        <span
                          className={`badge ${
                            lane.status === "DISRUPTED"
                              ? "badge-rose"
                              : lane.status === "EXPEDITED"
                              ? "badge-emerald"
                              : lane.status === "ALTERNATE"
                              ? "badge-cyan"
                              : "badge-purple"
                          }`}
                        >
                          {lane.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        <span>LT: {lane.leadTime}</span>
                        <span>Rate: {lane.cost}</span>
                        <span>Cap: {lane.capacity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Legend */}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "0.75rem 1rem",
                background: "rgba(15, 23, 42, 0.75)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ color: "#fff" }}>Legend:</strong>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f43f5e" }} />
                <span>Disrupted Path (Zero Order Allocation)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#38bdf8" }} />
                <span>Approved Alternate Sourcing (Pacific S2)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#34d399" }} />
                <span>Expedited Transport / Air-Freight Backup (S3 / Express)</span>
              </div>
            </div>
          </div>

          {/* Operational Inspector Drawer */}
          {selectedEntity && (
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Info size={16} color="var(--accent-cyan)" />
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                    {selectedEntity.type === "NODE" ? "Node Inspector" : "Lane Inspector"}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
                  aria-label="Close inspector drawer"
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Identifier
                </span>
                <h5 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
                  {selectedEntity.data.name || `${selectedEntity.data.originName} → ${selectedEntity.data.destinationName}`}
                </h5>
                <span style={{ fontSize: "0.74rem", color: "var(--accent-cyan)" }}>
                  {selectedEntity.data.type || `Transport Lane (${selectedEntity.data.id})`}
                </span>
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Status:</span>
                  <strong style={{ color: selectedEntity.data.status === "OUTAGE" || selectedEntity.data.status === "DISRUPTED" ? "#f43f5e" : "#34d399" }}>
                    {selectedEntity.data.status}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Lead Time:</span>
                  <span style={{ color: "#fff" }}>{selectedEntity.data.leadTime}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Capacity:</span>
                  <span style={{ color: "#fff" }}>{selectedEntity.data.capacity}</span>
                </div>
                {selectedEntity.data.costInfo && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Cost Basis:</span>
                    <span style={{ color: "#fff" }}>{selectedEntity.data.costInfo}</span>
                  </div>
                )}
                {selectedEntity.data.cost && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Freight Rate:</span>
                    <span style={{ color: "#fff" }}>{selectedEntity.data.cost}</span>
                  </div>
                )}
              </div>

              {selectedEntity.data.description && (
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    Operational Context
                  </span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.45 }}>
                    {selectedEntity.data.description}
                  </p>
                </div>
              )}

              {selectedEntity.data.demandScopeNote && (
                <div style={{ padding: "0.65rem 0.75rem", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "6px", fontSize: "0.74rem", color: "#e0f2fe", lineHeight: 1.4 }}>
                  <strong style={{ color: "var(--accent-cyan)", display: "block", marginBottom: "2px" }}>Scope Clarification:</strong>
                  {selectedEntity.data.demandScopeNote}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Accessible Table Alternative View */
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "#fff" }}>
            Network Nodes & Operational Attributes
          </h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Echelon</th>
                  <th>Node ID & Name</th>
                  <th>Operational Role</th>
                  <th>Daily Capacity</th>
                  <th>Lead Time</th>
                  <th>Inventory / Demand Scope</th>
                  <th>Current State</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id}>
                    <td>
                      <span className={`badge ${node.echelon === 1 ? "badge-purple" : node.echelon === 2 ? "badge-cyan" : "badge-emerald"}`}>
                        Tier {node.echelon}
                      </span>
                    </td>
                    <td><strong>{node.name}</strong></td>
                    <td style={{ color: "var(--text-muted)" }}>{node.type}</td>
                    <td>{node.capacity}</td>
                    <td>{node.leadTime}</td>
                    <td>{node.demandScopeNote}</td>
                    <td>
                      <span className={`badge ${node.badgeClass}`}>{node.badge}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
