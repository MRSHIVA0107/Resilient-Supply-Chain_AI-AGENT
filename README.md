# Resilient Supply Chain Platform
### Agentic AI Multi-Echelon Supply Network Recovery

An enterprise-grade, agentic AI platform engineered to evaluate and orchestrate the recovery of a three-echelon supply network during a seven-day critical-supplier shutdown.

Built with **FastAPI**, **Google OR-Tools CP-SAT**, **Next.js (App Router)**, **TypeScript**, and **PostgreSQL**.

---

## 1. Key Capabilities

- **Three-Echelon Topology**: Models suppliers ($S_1, S_2, S_3$), manufacturing plants ($\text{Plant-1}, \text{Plant-2}$), and distribution centers ($\text{DC-North}, \text{DC-South}, \text{DC-West}$) across a 14-day planning horizon.
- **Seven-Day Outage Scenario**: Apex Semiconductor ($S_1$) undergoes a complete 7-day shutdown (Days 1–7), blocking all new component orders.
- **Four Specialized Agents**:
  - **Demand Agent**: Quantifies demand exposure and flags service-sensitive customer orders.
  - **Inventory Agent**: Calculates buffer exhaustion curves and balances plant work-in-process.
  - **Supplier-Risk Agent**: Identifies eligible alternate suppliers ($S_2, S_3$) and verifies capacity and pricing.
  - **Logistics Agent**: Evaluates expedited transport lanes and validates physical arrival windows.
- **Deterministic Central Coordinator**: Detects proposal conflicts, deduplicates candidate actions, frames decision space for optimization, and computes trade-offs.
- **Mathematical Optimization (Google OR-Tools)**: Mixed-integer constraint programming optimizing multi-period flows and minimizing total landed costs ($ procurement + freight + expediting + holding) and backorder penalties.
- **Independent Plan Validator**: Recalculates all inventory balances and hard physical constraints directly from the immutable input snapshot.
- **Cryptographic Approval Gate**: Plan versions are signed with an immutable SHA-256 hash. Plans cannot execute without explicit planner authorization. Stale operational state changes invalidate prior approvals.
- **Idempotent Simulation Engine**: Dispatches approved actions day-by-day in simulation, preventing duplicate executions and logging each action outcome.
- **Fair Benchmarking Framework**: Direct comparison across three planning approaches on identical starting inventory and demand:
  1. Traditional Reorder-Point Policy (ROP)
  2. Pure OR-Tools Optimization Only
  3. Agent-Assisted Optimization
- **All 8 Industrial KPIs Measured**: Fill Rate, Backorder Volume, Total Landed Cost, Recovery Time, Days of Inventory, Constraint Violation Rate, Runtime Latency, and Recommendation Stability.

---

## 2. Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Vanilla CSS design system, Lucide icons.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy 2.0, Alembic.
- **Optimization**: Google OR-Tools (CP-SAT solver).
- **Database**: PostgreSQL / SQLite (for zero-setup local dev/testing).
- **Security**: Bcrypt password hashing, JWT access tokens, Role-Based Access Control (`PLANNER`, `ADMIN`, `AUDITOR`).

---

## 3. Prerequisites & Installation

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ (Node.js 20 or 24 recommended)
- `uv` (recommended for ultra-fast Python virtual environment setup) or `pip`

### Step 1: Set Up Backend
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment with Python 3.12
uv venv --python 3.12 .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Install pinned dependencies
uv pip install -r requirements.txt
```

### Step 2: Set Up Frontend
```powershell
# Navigate to frontend directory
cd ../frontend

# Install npm packages
npm install
```

---

## 4. Running the Application

### Start Backend API Server
```powershell
# In backend directory with virtual environment activated:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will start at: `http://localhost:8000`  
Interactive Swagger API docs available at: `http://localhost:8000/docs`  
Health check endpoint: `http://localhost:8000/health`

### Start Next.js Frontend
```powershell
# In frontend directory:
npm run dev
```
The web dashboard will start at: `http://localhost:3000`

---

## 5. Development Credentials

Pre-seeded development user accounts are automatically available:

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Senior Planner** | `planner` | `planner123` | Generate plans, approve/reject plans, execute simulated actions |
| **System Admin** | `admin` | `admin123` | Full administrative control, scenario reset, dataset administration |

---

## 6. End-to-End Workflow Walkthrough

1. **Open Dashboard**: Navigate to `http://localhost:3000`.
2. **Review Disruption Banner**: The top banner highlights the active 7-day shutdown of Apex Semiconductor ($S_1$) on Days 1 to 7.
3. **Inspect Topology Map**: Click **Topology Map** to view the multi-tier suppliers, assembly plants, and distribution centers.
4. **Run 4 Specialized Agents**: Click **Specialized Agents** -> **Re-Run All 4 Agents** to invoke the Demand, Inventory, Supplier-Risk, and Logistics agents on the validated snapshot.
5. **Generate Recovery Plan**: Click **Plan & Approval** -> **Generate New Plan** to run the central coordinator and OR-Tools CP-SAT solver.
6. **Authorize Plan**: Inspect the planned actions and trade-off summary, then click **Approve / Reject Plan** -> **Approve Plan** to cryptographically sign the plan hash.
7. **Execute in Simulator**: Click **Execute in Simulator**. The simulation engine executes the approved actions and displays daily inventory trajectories and fulfillment levels.
8. **Run Fair Benchmarks**: Click **Fair Benchmarks** -> **Run Multi-Approach Benchmark** to evaluate all three planning approaches side-by-side across all 8 KPIs.
9. **Inspect Audit Trail**: Click **Audit Trail** to view immutable audit records with cryptographic correlation IDs.

---

## 7. Running Automated Tests

Run the full pytest suite from the backend directory:
```powershell
cd backend
.\.venv\Scripts\python -m pytest tests/ -v
```
All 35 unit, optimization, security, and integration tests will execute.

Run the production frontend build check from the frontend directory:
```powershell
cd frontend
npm run build
```

---

## 8. Docker Compose Local Deployment

To run the complete stack in isolated containers (PostgreSQL + FastAPI Backend + Next.js Frontend):
```bash
docker-compose up --build
```
- PostgreSQL: `localhost:5432`
- Backend API: `http://localhost:8000`
- Web Frontend: `http://localhost:3000`
