"""Main FastAPI Application Entry Point."""
import uuid
import time
import json
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api import api_router
from app.models.user import User, UserRole
from app.models.scenario import Scenario, DisruptionEvent, ScenarioSnapshot, DisruptionType
from app.security.auth import get_password_hash
from app.data.generator import generate_demonstration_network


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for initialization and cleanup."""
    # 1. Initialize database tables
    Base.metadata.create_all(bind=engine)

    # 2. Seed default users and baseline scenario
    db = SessionLocal()
    try:
        # Seed planner and admin users if missing
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin = User(
                id="USR-ADMIN-01",
                username="admin",
                email="admin@supplychain.internal",
                full_name="Supply Chain Operations Admin",
                role=UserRole.ADMIN,
                hashed_password=get_password_hash("admin123"),
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(admin)

        planner_user = db.query(User).filter(User.username == "planner").first()
        if not planner_user:
            planner = User(
                id="USR-PLANNER-01",
                username="planner",
                email="planner@supplychain.internal",
                full_name="Senior Supply Chain Planner",
                role=UserRole.PLANNER,
                hashed_password=get_password_hash("planner123"),
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(planner)

        # Seed baseline demonstration scenario if empty
        existing_scen = db.query(Scenario).first()
        if not existing_scen:
            demo = generate_demonstration_network(scenario_id="SCENARIO-DEMO-01", seed=42)
            scen = Scenario(
                id=demo["scenario_id"],
                name=demo["name"],
                description=demo["description"],
                seed=demo["seed"],
                horizon_days=demo["horizon_days"],
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(scen)

            for dis in demo["disruptions"]:
                dis_ev = DisruptionEvent(
                    id=dis["id"],
                    scenario_id=scen.id,
                    target_node_id=dis["target_node_id"],
                    disruption_type=DisruptionType.SUPPLIER_SHUTDOWN,
                    start_day=dis["start_day"],
                    end_day=dis["end_day"],
                    severity=dis["severity"],
                    prevents_new_shipments=dis["prevents_new_shipments"],
                    prevents_in_transit_receipts=dis["prevents_in_transit_receipts"]
                )
                db.add(dis_ev)

            snap = ScenarioSnapshot(
                id=f"SNAP-{scen.id}-V1",
                scenario_id=scen.id,
                version=1,
                snapshot_hash=demo["snapshot_hash"],
                data_payload=json.dumps(demo["network_data"], sort_keys=True),
                created_at=datetime.utcnow()
            )
            db.add(snap)

        db.commit()
    finally:
        db.close()

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic AI Platform for Resilient Multi-Echelon Supply Network Recovery during Critical Supplier Shutdowns",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_and_timing_middleware(request: Request, call_next):
    """Attaches correlation ID and measures request execution latency."""
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    start_time = time.time()
    
    response = await call_next(request)
    
    elapsed_ms = (time.time() - start_time) * 1000.0
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.2f}"
    return response


# Mount API Routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(api_router)  # Also mount at root for convenient health/direct calls


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
