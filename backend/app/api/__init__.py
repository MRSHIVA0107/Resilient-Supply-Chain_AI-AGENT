"""API package initialization and routing."""
from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.scenarios import router as scenarios_router
from app.api.agents import router as agents_router
from app.api.plans import router as plans_router
from app.api.execution import router as execution_router
from app.api.benchmarks import router as benchmarks_router
from app.api.audit import router as audit_router
from app.api.health import router as health_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(scenarios_router)
api_router.include_router(agents_router)
api_router.include_router(plans_router)
api_router.include_router(execution_router)
api_router.include_router(benchmarks_router)
api_router.include_router(audit_router)

__all__ = ["api_router"]
