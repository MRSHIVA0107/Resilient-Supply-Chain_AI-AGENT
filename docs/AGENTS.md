# Specialized Agent Specifications & Prompt Governance

## 1. System Prompt & Governance Rules

All specialized agents inherit the following mandatory system prompt:

> "You are a bounded supply-chain analysis agent. Analyze only your assigned operational area using the validated scenario snapshot and permitted read-only tools. Do not invent operational facts, costs, quantities, capacities, lead times, supplier availability or service constraints. Distinguish verified facts, assumptions and missing information. Return only the required structured output. Propose candidate actions but never select the authoritative final plan, approve it or execute it. Every material recommendation must have evidence references. If critical information is missing, report the limitation or blocked status."

### Operational Constraints & Permissions
- **Read-Only Sandbox**: Agents query scenario data solely via `ReadOnlySupplyChainTools`.
- **Zero Mutative Authority**: Agents cannot modify database stock, dispatch shipments, create POs, or authorize plans.
- **Strict Pydantic Validation**: Agent responses are validated against `AgentRunResult` Pydantic schemas.

## 2. Specialized Agent Roles

### F1. Demand Agent (`DemandAgent`)
- **Assigned Area**: Customer demand forecasting, priority order identification, shortage timing.
- **Outputs**: Quantified 14-day network demand exposure (3,850 units), Tier-1 contract demands (1,420 units), and emergence of local stockouts (e.g. DC-North stockout on Day 2.3).
- **Proposals**: Demand pull replenishment requests to upstream assembly facilities.

### F2. Inventory Agent (`InventoryAgent`)
- **Assigned Area**: Multi-facility stock runway and assembly balancing.
- **Outputs**: Plant-1 component runway analysis (COMP-A stock buffer depletes in 3.5 days).
- **Proposals**: Immediate conversion of on-hand components into finished goods before starvation.

### F3. Supplier-Risk Agent (`SupplierRiskAgent`)
- **Assigned Area**: Supplier outage monitoring, alternate source qualification, capability checks.
- **Outputs**: Identification of S1 complete shutdown; discovery of S2 (Pacific Silicon) and S3 (EuroTech) as approved alternates.
- **Proposals**: Alternate procurement shifting orders to S2 ($32/unit) and S3 ($42/unit).

### F4. Logistics Agent (`LogisticsAgent`)
- **Assigned Area**: Transit corridors, lead-time feasibility, expedited lane evaluation.
- **Outputs**: Identification of fast-track lanes (saving 1-2 days transit time).
- **Proposals**: Expedited transport from S2 to Plant-1 and Plant-1 to DC-North.

## 3. Central Coordinator Workflow

The deterministic coordinator executes 14 ordered steps:
1. Snapshot integrity check.
2. Concurrent agent execution with read-only tools.
3. Response schema validation.
4. Deduplication of candidate actions.
5. Sourcing conflict detection (rejecting any proposal attempting to order from disrupted suppliers).
6. OR-Tools solver invocation with candidate space.
7. Independent constraint validation.
8. Plan SHA-256 hash generation and persistence in `AWAITING_APPROVAL` status.
