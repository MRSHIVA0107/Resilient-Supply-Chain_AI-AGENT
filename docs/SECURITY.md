# Application Security & Governance Controls

## 1. Identity, Authentication, and Permissions

- **Authentication**: JWT access tokens signed with HMAC-SHA256 (`HS256`).
- **Password Protection**: Passwords hashed with `bcrypt` (salted, work factor 12). Plaintext passwords are never persisted or logged.
- **Role-Based Authorization**:
  - `PLANNER`: Can inspect scenarios, run agents, generate plans, approve/reject plans, execute simulated actions.
  - `ADMIN`: Full operational and user management permissions.
  - `AUDITOR`: Read-only access to audit logs and evaluation benchmarks.

## 2. Cryptographic Approval Safety

- **Plan Hash Verification**: Every plan generates a SHA-256 hash across its actions, snapshot hash, objective values, and status.
- **Tamper Resistance**: Approval records verify that the presented hash exactly matches the stored plan hash. If an attacker or caller modifies an action item, the hash becomes invalid and execution is rejected.
- **Stale State Invalidation**: Prior to executing a plan, the execution engine verifies that the underlying scenario snapshot has not been superseded by a newer version. If the operational state changed, the plan transitions to `INVALIDATED` and re-planning is enforced.

## 3. Execution Protection & Idempotency

- **Idempotency Keys**: Execution requests require an `idempotency_key`. Duplicate requests with identical keys are rejected with a clear operational warning, preventing duplicate order placement.
- **Simulator Sandbox**: All execution actions are dispatched solely into the discrete-event simulation engine in this release; no unauthenticated external purchase orders or live fleet dispatching are performed.
