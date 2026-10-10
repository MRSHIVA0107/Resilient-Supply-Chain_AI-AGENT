# Operations, Observability & Incident Recovery

## 1. Structured Logging & Observability

- **Correlation Tracing**: Every API call requires or generates an `X-Correlation-ID` header. This ID is passed to audit events, solver records, and agent runs, enabling complete reconstruction of planning lifecycles.
- **Latency Monitoring**: Each HTTP response includes `X-Response-Time-Ms` measuring total request duration.
- **Health Diagnostics**: `GET /health` provides uptime, environment, and real-time database connectivity status.

## 2. Database Migrations & Rollback Procedures

Alembic handles database migrations.
- **Run migrations**:
  ```bash
  alembic upgrade head
  ```
- **Rollback migrations**:
  ```bash
  alembic downgrade -1
  ```
- **Audit Preservation**: Rollbacks must never truncate `audit_events` or `execution_runs` tables to preserve regulatory compliance and incident history.

## 3. Database Backup & Restore Procedures

### PostgreSQL Backup
```bash
# Export full database dump with schema and data
pg_dump -U postgres -d supply_chain -F c -b -v -f backup_supply_chain.dump
```

### PostgreSQL Restore
```bash
# Restore from backup dump into clean database
pg_restore -U postgres -d supply_chain -v backup_supply_chain.dump
```
When restored, previous scenario snapshots, approval signatures, and audit trails remain fully verifiable and inspectable.
