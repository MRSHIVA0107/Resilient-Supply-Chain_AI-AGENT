# Relational Data Model & Schema Specifications

The relational schema is implemented in PostgreSQL (with SQLite compatibility for local testing), backed by SQLAlchemy declarative models and Alembic migration tracking.

## 1. Domain Entities & Tables

### Core Entities
- **`nodes`**: Represents physical network facilities.
  - `id` (VARCHAR PK): e.g. `S1`, `Plant-1`, `DC-North`
  - `name` (VARCHAR): Facility designation
  - `node_type` (ENUM): `SUPPLIER`, `PLANT`, `DC`
  - `location` (VARCHAR): Geographic location
  - `capacity_per_day` (FLOAT): Daily processing or supply throughput limit

- **`products`**: Components and finished assemblies.
  - `id` (VARCHAR PK): e.g. `COMP-A`, `PROD-1`
  - `name` (VARCHAR): Product description
  - `product_type` (ENUM): `RAW_COMPONENT`, `FINISHED_GOOD`
  - `unit_holding_cost_per_day` (FLOAT): Inventory carrying cost
  - `unit_backorder_penalty_per_day` (FLOAT): Unfulfilled demand penalty

- **`bill_of_materials`**: BOM parent-component relationships.
  - `parent_product_id` (FK -> products.id)
  - `component_product_id` (FK -> products.id)
  - `quantity_required` (FLOAT): Conversion multiplier

- **`transport_lanes`**: Transportation corridors.
  - `id` (VARCHAR PK): e.g. `L-S1-P1`
  - `origin_node_id` (FK -> nodes.id)
  - `destination_node_id` (FK -> nodes.id)
  - `normal_lead_time_days` / `expedited_lead_time_days` (INTEGER)
  - `normal_cost_per_unit` / `expedited_cost_per_unit` (FLOAT)
  - `daily_capacity` (FLOAT)

- **`supplier_capabilities`**: Supplier part sourcing eligibility.
  - `supplier_id` (FK -> nodes.id), `product_id` (FK -> products.id)
  - `unit_cost` (FLOAT), `max_daily_capacity` (FLOAT), `is_qualified` (BOOLEAN)

### Operational State & Planning
- **`scenarios`**: High-level simulation scenario configurations.
- **`disruption_events`**: Target outage schedules and severity settings.
- **`scenario_snapshots`**: Immutable serialized JSON payloads with SHA-256 integrity hashes.
- **`plans`**: Multi-period recovery plan versions with plan hash, cost, status, and trade-off summaries.
- **`plan_actions`**: Granular planned actions (`PROCUREMENT`, `EXPEDITED_PROCUREMENT`, `PRODUCTION`, `SHIPMENT`, `EXPEDITED_SHIPMENT`).
- **`approval_records`**: Cryptographic sign-offs with planner identity, timestamp, and decision.
- **`execution_runs` & `execution_action_logs`**: Recorded simulated dispatch runs.
- **`idempotency_keys`**: Prevents accidental re-dispatch of approved recovery actions.
- **`benchmark_runs` & `benchmark_metrics`**: Persistent records of all 8 KPIs across the 3 planning approaches.
- **`audit_events`**: Immutable audit logs correlated by `correlation_id`.
