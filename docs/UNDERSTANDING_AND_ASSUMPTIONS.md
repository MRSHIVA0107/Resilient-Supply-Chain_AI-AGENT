# Understanding and Assumptions

## 1. Problem Statement & Scope

The application addresses an acute supply-chain disruption: a critical Tier-1 supplier experiencing an unanticipated complete shutdown for seven consecutive days in a multi-echelon manufacturing network.

### Key Questions Answered:
1. **Network Exposure**: Apex Semiconductor (S1) is offline Days 1–7. Plant-1 buffer of COMP-A depletes by Day 3.5.
2. **Shortage Timing**: Without alternate sourcing, finished goods stock at DC-North exhausts by Day 2.3, causing severe backorders.
3. **Alternate Sourcing**: Pacific Silicon (S2) and EuroTech Electronics (S3) can supply COMP-A. S2 offers standard 2-day lead time ($32/unit); S3 offers 1-day expedited transit ($42/unit).
4. **Interventions**: Early conversion of on-hand buffer, shifted procurement to S2/S3, and expedited freight on Plant-1 → DC-North lane.
5. **Recovery Plan**: An integer-constrained mathematical schedule minimizing total landed cost ($ procurement + freight + expediting + holding) and backorders while respecting all physical network constraints.

## 2. Explicit Business Assumptions & Conventions

- **Planning Horizon**: 14 days (multi-period discrete days $t \in [1, 14]$).
- **Outage Semantics**: The shutdown of Supplier S1 prevents the *initiation of new purchase orders* during Days 1 through 7. Confirmed shipments in-transit prior to Day 1 are received normally upon their scheduled arrival date.
- **Physical Conservations**:
  - Unconfirmed proposed shipments are *never* counted as available physical inventory.
  - Work-in-process Bill of Materials conversion: 1 PROD-1 requires 1 COMP-A + 1 COMP-B. 1 PROD-2 requires 1 COMP-B.
- **Cost Weights**:
  - Procurement: S1 ($25), S2 ($32), S3 ($42)
  - Freight: Normal ($4–$12/unit), Expedited ($14–$45/unit)
  - Assembly: $10/unit
  - Holding: $0.10–$1.50/unit/day
  - Backorder Penalty: $50–$120/unit/day
- **Units**: Quantities in discrete units (whole integers); Currency in USD ($); Time in integer days.
- **Production Pilot Confirmation Required**: Prior to connecting to live SAP/Oracle ERP or warehouse management systems, business stakeholders must calibrate penalty weights, lead-time variances, and organizational approval tiers.
