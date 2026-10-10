"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  BrainCircuit,
  FileCheck,
  PlayCircle,
  BarChart3,
  FileText,
  UploadCloud,
  Menu,
  X,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemHealth: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, systemHealth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "topology", label: "Topology Map", icon: Layers },
    { id: "exposure", label: "Exposure Analysis", icon: ShieldAlert },
    { id: "agents", label: "Specialized Agents", icon: BrainCircuit },
    { id: "plan", label: "Plan & Approval", icon: FileCheck },
    { id: "whatif", label: "What-If Workbench", icon: Activity },
    { id: "execution", label: "Simulator Execution", icon: PlayCircle },
    { id: "benchmarks", label: "Fair Benchmarks", icon: BarChart3 },
    { id: "guardrails", label: "Guardrails & Safety", icon: ShieldCheck },
    { id: "governance", label: "Failure & Governance", icon: ShieldAlert },
    { id: "import", label: "Data Validation", icon: UploadCloud },
    { id: "audit", label: "Audit Trail", icon: FileText },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="brand-badge">
        <div className="brand-icon">
          <ShieldAlert size={18} color="#fff" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>ResilientChain</span>
          <span
            style={{
              color: "var(--accent-cyan)",
              fontSize: "0.68rem",
              padding: "1px 6px",
              background: "rgba(6,182,212,0.12)",
              border: "1px solid rgba(6,182,212,0.25)",
              borderRadius: "4px",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            v1.0 AGENTIC
          </span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="nav-tabs" aria-label="Main Application Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`nav-tab-btn ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Backend & Role Context Indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.76rem" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: systemHealth === "HEALTHY" ? "#10b981" : "#f59e0b",
              boxShadow: systemHealth === "HEALTHY" ? "0 0 8px #10b981" : "none",
            }}
          />
          <span style={{ color: "var(--text-dim)" }}>Backend:</span>
          <span style={{ color: "#fff", fontWeight: 600 }}>{systemHealth}</span>
        </div>
        <div
          style={{
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.28)",
            padding: "3px 8px",
            borderRadius: "5px",
            fontSize: "0.72rem",
            color: "#60a5fa",
            fontWeight: 700,
            letterSpacing: "0.03em",
          }}
        >
          ROLE: PLANNER
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-secondary"
          style={{
            display: "none",
            padding: "0.35rem 0.5rem",
            fontSize: "0.75rem",
          }}
          id="mobile-nav-toggle"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Mobile Drawer (visible when open) */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "rgba(11, 17, 33, 0.98)",
            borderBottom: "1px solid var(--border-color)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            zIndex: 60,
            backdropFilter: "blur(16px)",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`nav-tab-btn ${isActive ? "active" : ""}`}
                style={{ justifyContent: "flex-start", padding: "0.65rem 1rem", fontSize: "0.85rem" }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
