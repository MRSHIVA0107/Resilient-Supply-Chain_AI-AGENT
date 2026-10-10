# System Architecture & Component Boundaries

## 1. Overview & Logical Architecture

ResilientChain is designed as a modular, industrial supply-chain planning and recovery platform. It integrates agentic situational analysis, deterministic mathematical optimization (Google OR-Tools), an independent constraint validation engine, an immutable approval gate, and a discrete-event simulator.

```
                    +-----------------------------+
                    |    Planner Browser UI       |
                    | (Next.js App Router, React) |
                    +--------------+--------------+
                                   | (REST + JWT Bearer)
                                   v
                    +-----------------------------+
                    |   Authenticated API Layer   |
                    |      (FastAPI, Uvicorn)     |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |  Scenario & Snapshot Store  |
                    |   (Immutable SHA-256 Hash)  |
                    +--------------+--------------+
                                   |
                                   v
      +----------------------------+----------------------------+
      |                            |                            |
      v                            v                            v
+--------------+             +--------------+             +--------------+
| Demand Agent |             | Inventory Ag |             | SupplierRisk |
+--------------+             +--------------+             +--------------+
      |                            |                            |
      +----------------------------+----------------------------+
                                   |
                                   v
                    +-----------------------------+
                    |    Logistics Agent & Tools  |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |    Central Coordinator      |
                    |  - Deduplication            |
                    |  - Conflict Detection       |
                    |  - Action Framing           |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |   OR-Tools CP-SAT Solver    |
                    |  (Mixed-Integer Optimizer)  |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    | Independent Plan Validator  |
                    | (Recalculates Constraints)  |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    | Versioned Plan (Draft/Val)  |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    | Authoritative Approval Gate |
                    | (Cryptographic Hash Signed) |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |   Simulated Execution       |
                    |  (Idempotency Protected)    |
                    +--------------+--------------+
                                   |
                                   v
                    +-----------------------------+
                    |  Audit Trail & Evaluation   |
                    | (8 Industrial KPI Metrics)  |
                    +-----------------------------+
```

## 2. Authority & Boundary Rules

1. **Backend Authority**: All inventory balances, procurement feasibility, optimization execution, approval transitions, and KPI calculations are strictly owned and computed by the Python FastAPI backend. The Next.js frontend is purely a presentation and interaction layer.
2. **Read-Only Agent Permissions**: Agents interact with scenario data strictly through `ReadOnlySupplyChainTools`. Agents cannot mutate operational database state, place live orders, or bypass the coordinator.
3. **Immutable Snapshots**: Planning and optimization always reference a versioned `ScenarioSnapshot` identified by a SHA-256 hash. If underlying operational state changes, plans referencing older snapshots are invalidated before execution.
4. **Independent Plan Validation**: The plan returned by the solver is never blindly trusted. `IndependentPlanValidator` recalculates all physical conservation laws, capacities, and lead times from raw snapshot data.
5. **Human-in-the-Loop Approval Gate**: No plan can transition to execution without formal planner authorization matching the exact immutable plan SHA-256 hash.
