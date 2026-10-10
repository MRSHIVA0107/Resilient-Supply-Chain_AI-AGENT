/**
 * JS-only API client — calls Next.js internal API routes.
 * Fully typed, self-contained Next.js client.
 */

const API_BASE = "";

async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorDetail = errorJson.error;
      if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  /** Health check */
  async getHealth() {
    return request("/api/health");
  },

  /** Get full scenario + network data */
  async getScenario() {
    return request("/api/scenario");
  },

  /** Run 4 AI agents + coordinator (OpenRouter + deterministic) */
  async runAgents(options: { model?: string; horizon_days?: number } = {}) {
    return request("/api/agents", {
      method: "POST",
      body: JSON.stringify(options),
    });
  },

  /** Generate recovery plan (JS optimizer) */
  async generatePlan() {
    return request("/api/plan", { method: "POST" });
  },

  /** Run benchmark comparing 3 approaches */
  async runBenchmark() {
    return request("/api/benchmark", { method: "POST" });
  },

  /** Run What-If simulation scenario (Deliverable 5) */
  async runWhatIf(params: Record<string, any>) {
    return request("/api/whatif", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /** Validate external dataset schema (Deliverable 7) */
  async validateDataset(data: any) {
    return request("/api/validate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /** Get failure modes & resilience analysis (Deliverable 7) */
  async getGovernanceAnalysis() {
    return request("/api/governance");
  },

  /** Verify plan cryptographic compliance (Deliverable 7) */
  async verifyPlanCompliance(plan: any, approvalRecord: any = null) {
    return request("/api/governance", {
      method: "POST",
      body: JSON.stringify({ plan, approval_record: approvalRecord }),
    });
  },

  /** Approve/reject a plan */
  async approvePlan(planId: string, planHash: string, decision: string, comments: string) {
    await api.logAuditEvent({
      event_type: "PLAN_DECISION",
      actor: "planner",
      entity_type: "RecoveryPlan",
      entity_id: planId,
      description: `Plan ${planId} — Decision: ${decision}. Comments: ${comments || "None"}`,
      metadata: { plan_hash: planHash, decision, comments },
    });
    return { plan_id: planId, decision, status: decision === "APPROVED" ? "APPROVED" : "REJECTED" };
  },

  /** Execute approved plan in simulation engine */
  async executePlan(plan: any, idempotencyKey?: string) {
    const res = await request("/api/execute", {
      method: "POST",
      body: JSON.stringify({ plan, idempotency_key: idempotencyKey }),
    });

    await api.logAuditEvent({
      event_type: "PLAN_EXECUTED",
      actor: "planner",
      entity_type: "RecoveryPlan",
      entity_id: plan.plan_id,
      description: `Recovery plan ${plan.plan_id} executed in simulation engine. Fill rate: ${(res.details?.simulation_metrics?.fill_rate * 100 || 0).toFixed(1)}%`,
      metadata: { run_id: res.details?.execution_run_id, actions_count: plan.actions?.length },
    });

    return res;
  },

  /** Get audit events */
  async getAuditEvents() {
    return request("/api/audit");
  },

  /** Log an audit event */
  async logAuditEvent(event: any) {
    return request("/api/audit", {
      method: "POST",
      body: JSON.stringify(event),
    });
  },

  /** Get Guardrail System Status & Active Definitions */
  async getGuardrails() {
    return request("/api/guardrails");
  },

  /** Run live test or simulation against a specific guardrail */
  async testGuardrail(payload: Record<string, any>) {
    return request("/api/guardrails", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
