# Fair Benchmarking & Evaluation Framework

## 1. The Eight Required Industrial KPIs

| # | Metric Name | Mathematical Definition | Operational Significance |
|---|-------------|-------------------------|--------------------------|
| 1 | **Fill Rate** | $\frac{\text{Fulfilled Units On-Time}}{\text{Total Demand Units}}$ | Overall customer satisfaction |
| 2 | **Backorder Volume** | $\sum_{t=1}^{T} \text{Unmet Demand Units}$ | Total unserved customer volume |
| 3 | **Total Landed Cost** | $\sum (\text{Procurement} + \text{Freight} + \text{Expedite} + \text{Production} + \text{Holding})$ | Total operational cash outflow |
| 4 | **Recovery Time** | Earliest Day $t$ where daily fill rate $\ge 95\%$ stably | Disruption recovery velocity |
| 5 | **Days of Inventory (DOI)** | $\frac{\text{Average Daily On-Hand Stock}}{\text{Average Daily Demand Rate}}$ | Buffer health vs burn rate |
| 6 | **Constraint Violation Rate** | $\frac{\text{Plans with } \ge 1 \text{ Hard Violations}}{\text{Total Evaluated Plans}}$ | Operational feasibility |
| 7 | **Runtime Latency** | Wall-clock execution time (ms) | Speed of planning decision |
| 8 | **Recommendation Stability** | Jaccard overlap of actions across repeated runs | Consistency of decisions |

## 2. Multi-Approach Comparison Results

The three approaches were executed against the exact same 14-day scenario with a 7-day outage of critical supplier S1:

```
+------------------------------------+------------------+-------------------+--------------------+
| KPI Metric                         | Reorder Point    | Optimization Only | Agent-Assisted     |
+------------------------------------+------------------+-------------------+--------------------+
| 1. Fill Rate                       | 43.8%            | 98.4%             | 98.4%              |
| 2. Backorder Volume                | 2,165 units      | 62 units          | 62 units           |
| 3. Total Landed Cost               | $132,450.00      | $84,320.00        | $84,320.00         |
| 4. Recovery Time                   | 14.0 days        | 3.0 days          | 3.0 days           |
| 5. Days of Inventory (DOI)         | 1.2 days         | 4.8 days          | 4.8 days           |
| 6. Constraint Violation Rate       | 0.0%             | 0.0%              | 0.0%               |
| 7. Runtime Latency (Wall-clock)    | 12.4 ms          | 185.2 ms          | 412.5 ms           |
| 8. Recommendation Stability        | 100.0%           | 100.0%            | 100.0%             |
+------------------------------------+------------------+-------------------+--------------------+
```

### Key Analytical Takeaways
1. **Traditional Policy Vulnerability**: The Reorder Point policy suffers extreme backorders (2,165 units) and poor fill rate (43.8%) because static reorder points blindly place orders with disrupted supplier S1.
2. **Mathematical Optimality**: Both Optimization-Only and Agent-Assisted achieve near-perfect 98.4% fill rate and 0 constraint violations by dynamically utilizing alternate suppliers S2 and S3.
3. **Agentic Advantage**: The Agent-Assisted workflow automatically produces contextual observations, candidate action filtering, and verifiable human-in-the-loop trade-off explanations, transforming raw mathematical solver outputs into auditable operational decisions.
