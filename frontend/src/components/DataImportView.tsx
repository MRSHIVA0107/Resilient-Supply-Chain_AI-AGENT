"use client";

import React, { useState } from "react";
import { UploadCloud, CheckCircle2, AlertOctagon, FileCode } from "lucide-react";
import { api } from "@/lib/api";

export const DataImportView: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(`{
  "nodes": [
    {"id": "S1", "name": "Apex Semi", "node_type": "SUPPLIER", "location": "Taiwan", "capacity_per_day": 450},
    {"id": "Plant-1", "name": "Austin Plant", "node_type": "PLANT", "location": "Austin", "capacity_per_day": 600}
  ],
  "products": [
    {"id": "COMP-A", "name": "SoC", "product_type": "RAW_COMPONENT"}
  ],
  "lanes": [
    {"id": "L1", "origin_node_id": "S1", "destination_node_id": "Plant-1", "normal_lead_time_days": 2, "normal_cost_per_unit": 10, "expedited_lead_time_days": 1, "expedited_cost_per_unit": 25, "daily_capacity": 400}
  ],
  "supplier_capabilities": [
    {"id": "C1", "supplier_id": "S1", "product_id": "COMP-A", "unit_cost": 25, "max_daily_capacity": 350, "lead_time_days": 2, "is_qualified": true}
  ],
  "initial_inventory": [
    {"id": "I1", "node_id": "Plant-1", "product_id": "COMP-A", "day": 1, "on_hand": 300, "reserved": 20}
  ],
  "confirmed_inbound_shipments": [],
  "demands": []
}`);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await api.validateDataset(parsed);
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({
        is_valid: false,
        error_count: 1,
        errors: [{ record_type: "JSON", record_id: "PAYLOAD", field: "syntax", message: err.message }],
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
          Supply Chain Data Import & Structural Integrity Validation
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
          Validates external supply network records against relational, capacity, lead-time, and business rules before ingestion.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "#fff" }}>
            Dataset JSON Payload
          </h3>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={16}
            className="input-field"
            style={{ fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }}
          />
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="btn btn-primary"
            style={{ marginTop: "1rem", width: "100%" }}
          >
            <UploadCloud size={16} />
            <span>{isValidating ? "Validating Rules..." : "Validate Dataset Schema"}</span>
          </button>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "#fff" }}>
            Validation Diagnostic Report
          </h3>

          {validationResult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: validationResult.is_valid ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                  border: `1px solid ${validationResult.is_valid ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                }}
              >
                {validationResult.is_valid ? (
                  <CheckCircle2 size={20} color="#34d399" />
                ) : (
                  <AlertOctagon size={20} color="#f43f5e" />
                )}
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
                    {validationResult.is_valid ? "VALIDATION PASSED" : `FAILED: ${validationResult.error_count} ERRORS DETECTED`}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {validationResult.is_valid ? "Dataset satisfies all schema and constraint definitions" : "Data integrity violations block safe planning"}
                  </div>
                </div>
              </div>

              {!validationResult.is_valid && validationResult.errors && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "340px", overflowY: "auto" }}>
                  {validationResult.errors.map((err: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.65rem 0.85rem",
                        borderRadius: "6px",
                        background: "rgba(244, 63, 94, 0.05)",
                        border: "1px solid rgba(244, 63, 94, 0.2)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#fb7185" }}>
                        {err.record_type} [{err.record_id}] → Field: <code>{err.field}</code>
                      </div>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                        {err.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Paste or modify network payload and click "Validate Dataset Schema" to inspect integrity errors.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
