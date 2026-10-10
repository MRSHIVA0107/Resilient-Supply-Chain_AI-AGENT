// Extended types for the JS-only agentic platform

export interface Node {
  id: string;
  name: string;
  type: "SUPPLIER" | "PLANT" | "DC";
  node_type?: "SUPPLIER" | "PLANT" | "DC";
  location: string;
  capacity_per_day?: number;
  daily_capacity_units?: number;
}

export interface TransportLane {
  id: string;
  origin_node_id: string;
  destination_node_id: string;
  mode: string;
  normal_lead_time_days: number;
  normal_cost_per_unit: number;
  expedited_lead_time_days: number;
  expedited_cost_per_unit: number;
  max_capacity_per_shipment: number;
  daily_capacity?: number;
}

export interface DisruptionEvent {
  id: string;
  target_node_id: string;
  disruption_type: string;
  start_day: number;
  end_day: number;
  severity: number;
  prevents_new_shipments: boolean;
  financial_exposure_usd?: number;
  description?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  disruptions: DisruptionEvent[];
  affected_products?: string[];
  network_exposure_percent?: number;
  // Legacy compat
  seed?: number;
  horizon_days?: number;
  is_active?: boolean;
  version?: number;
  current_version?: number;
}

export interface AgentObservation {
  category: string;
  entity_id: string;
  product_id?: string | null;
  day?: number | null;
  description: string;
  severity: string;
  evidence_ref: string;
}

export interface CandidateProposal {
  proposal_id: string;
  agent_name: string;
  action_type: string;
  origin_node_id?: string | null;
  destination_node_id: string;
  product_id: string;
  quantity: number;
  start_day: number;
  delivery_day: number;
  estimated_unit_cost: number;
  total_estimated_cost: number;
  rationale: string;
  evidence_ref: string;
  priority_score: number;
}

export interface AgentResult {
  agent_name: string;
  status: string;
  prompt_version: string;
  model_provider?: string;
  model_identifier?: string;
  execution_time_ms: number;
  ai_analysis?: string | null;
  observations: AgentObservation[];
  proposals: CandidateProposal[];
  assumptions: string[];
  warnings: string[];
  evidence_refs: string[];
  metrics: Record<string, any>;
}

export interface PlanAction {
  id?: string;
  action_type: string;
  origin_node_id?: string | null;
  destination_node_id: string;
  product_id: string;
  quantity: number;
  start_day: number;
  delivery_day: number;
  estimated_cost: number;
  rationale?: string;
  evidence_ref?: string;
  is_expedited?: boolean;
}

export interface RecoveryPlan {
  // JS plan fields
  plan_id?: string;
  plan_hash?: string;
  // Legacy plan fields
  id?: string;
  scenario_id?: string;
  version?: number;
  status: string;
  approach: string;
  solver_status: string;
  total_cost: number;
  expected_fill_rate: number;
  expected_backorders: number;
  solver_duration_ms: number;
  workflow_duration_ms?: number;
  trade_off_summary?: string;
  rejection_reason?: string;
  actions: PlanAction[];
  evaluation?: any;
  // Legacy approvals
  approvals?: Array<{
    id: string;
    decision: string;
    comments?: string;
    created_at: string;
  }>;
}

export interface KPIResult {
  fill_rate: number;
  fill_rate_raw: number;
  backorders: number;
  backorder_rate_pct: number;
  total_landed_cost: number;
  cost_per_unit_served: number;
  recovery_time_days: number;
  inventory_days_of_cover: number;
  constraint_violations: number;
  runtime_ms: number;
  recommendation_stability: number;
  service_level_pct: number;
}

export interface EvaluationResult {
  approach: string;
  kpis: KPIResult;
  action_counts: {
    total: number;
    by_type: Record<string, number>;
    expedited_count: number;
  };
  solver_status: string;
  trade_off_summary: string;
  grading: { grade: string; label: string; color: string };
}

export interface BenchmarkData {
  // New JS benchmark format
  results?: {
    optimizer?: EvaluationResult;
    reorder_point?: EvaluationResult;
    agent_assisted?: EvaluationResult | null;
  };
  comparisons_vs_rop?: Record<string, { absolute: number; percent: number; is_better: boolean }>;
  winner?: { fill_rate: string; cost: string; recovery: string; overall: string; scores: Record<string, number> };
  summary?: { best_fill_rate: string; best_cost: string; fastest_recovery: string; recommendation: string };
  metadata?: { evaluated_at: string; horizon_days: number; total_demand_vol: number };
  // Legacy format compat
  benchmark_run_id?: string;
  scenario_id?: string;
  metrics?: Array<{ approach: string; fill_rate: number; [key: string]: any }>;
  comparison_table?: Array<{ metric_name: string; [key: string]: any }>;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: string;
  actor: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, any>;
  // Legacy compat
  correlation_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
}
