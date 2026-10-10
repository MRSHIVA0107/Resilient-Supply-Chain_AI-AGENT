"""API Dependencies for security, authentication, and database sessions."""
import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.security.auth import decode_access_token
from app.security.permissions import check_user_role

security_bearer = HTTPBearer(auto_error=False)


def get_correlation_id(x_correlation_id: Optional[str] = Header(None)) -> str:
    """Extracts or generates an immutable correlation ID for request tracing."""
    if x_correlation_id:
        return x_correlation_id
    return str(uuid.uuid4())


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Validates JWT bearer token and returns authenticated user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def require_planner(current_user: User = Depends(get_current_user)) -> User:
    """Requires PLANNER or ADMIN role."""
    check_user_role(current_user, [UserRole.PLANNER, UserRole.ADMIN])
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Requires ADMIN role."""
    check_user_role(current_user, [UserRole.ADMIN])
    return current_user
