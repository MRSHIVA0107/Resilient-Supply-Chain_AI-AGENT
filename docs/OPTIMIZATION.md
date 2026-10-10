# Mathematical Optimization Formulation & Solver Specifications

## 1. Mathematical Model

The optimization model is formulated as a multi-period Mixed-Integer Constraint Satisfaction and Optimization Problem using **Google OR-Tools CP-SAT**.

### Sets & Indices
- $N$: Set of all nodes (Suppliers $S$, Plants $P$, Distribution Centers $DC$).
- $K$: Set of products (Raw components $C$, Finished goods $FG$).
- $L$: Set of transport lanes $(i, j)$.
- $T$: Time horizon $t \in \{1, \dots, 14\}$.

### Decision Variables (Integer Flows)
- $O_{l, c, t} \ge 0$: Normal procurement orders on lane $l$ for component $c$ on day $t$.
- $O^{\text{exp}}_{l, c, t} \ge 0$: Expedited procurement orders.
- $P_{p, fg, t} \ge 0$: Assembly units of finished good $fg$ at plant $p$ on day $t$.
- $X_{l, fg, t} \ge 0$: Normal shipments on lane $l$ to DC on day $t$.
- $X^{\text{exp}}_{l, fg, t} \ge 0$: Expedited shipments.
- $I_{n, k, t} \ge 0$: Inventory level of product $k$ at facility $n$ at end of day $t$.
- $BO_{dc, fg, t} \ge 0$: Cumulative unserved backorder volume.
- $S_{dc, fg, t} \ge 0$: Fulfilled sales demand.

### Objective Function
Minimize Total Modeled Cost (scaled by 100 to ensure integer-compatible arithmetic):

$$\min \sum \text{ProcurementCost} + \sum \text{FreightCost} + \sum \text{ExpeditePremiums} + \sum \text{ProductionCost} + \sum \text{HoldingCost} + \sum \text{BackorderPenalties}$$

### Constraints
1. **Supplier Shutdown & Daily Capacity**:
   $$\sum_{c} (O_{l, c, t} + O^{\text{exp}}_{l, c, t}) \le \text{Capacity}_{s, t}$$
   If supplier $s$ is under active shutdown on day $t$:
   $$\sum_{c} (O_{l, c, t} + O^{\text{exp}}_{l, c, t}) = 0$$

2. **Transport Lane Capacity**:
   $$\sum_{k} (X_{l, k, t} + X^{\text{exp}}_{l, k, t}) \le \text{DailyLaneCapacity}_{l}$$

3. **Plant Production Capacity**:
   $$\sum_{fg} P_{p, fg, t} \le \text{PlantCapacity}_{p}$$

4. **Component Conservation at Assembly Plants**:
   $$I_{p, c, t} = I_{p, c, t-1} + \text{InboundReceipts}_{p, c, t} - \sum_{fg} \text{BOM}_{fg, c} \cdot P_{p, fg, t}$$

5. **Finished Goods Conservation at DCs**:
   $$I_{dc, fg, t} = I_{dc, fg, t-1} + \text{InboundReceipts}_{dc, fg, t} - S_{dc, fg, t}$$

6. **Customer Demand & Backorder Conservation**:
   $$BO_{dc, fg, t} = BO_{dc, fg, t-1} + \text{Demand}_{dc, fg, t} - S_{dc, fg, t}$$

## 2. Solver States & Independent Validation

- Handled solver outcomes: `OPTIMAL`, `FEASIBLE`, `INFEASIBLE`, `MODEL_INVALID`, `TIMEOUT`.
- **Independent Validation**: The `IndependentPlanValidator` recalculates all node inventory balances, lane flows, supplier disruption orders, and lead times directly from raw snapshot data. Any hard constraint violation immediately transitions the plan to `FAILED`.
