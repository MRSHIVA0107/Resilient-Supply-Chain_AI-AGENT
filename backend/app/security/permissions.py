"""Role-based authorization and permissions controls."""
from typing import List
from fastapi import HTTPException, status
from app.models.user import User, UserRole


def check_user_role(user: User, allowed_roles: List[UserRole]) -> None:
    """Verifies that user has at least one of the allowed roles."""
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{user.role}' lacks permissions for this operation. Requires one of: {[r.value for r in allowed_roles]}"
        )
