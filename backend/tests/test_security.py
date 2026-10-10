"""Security and role-based permissions tests."""
import pytest
from app.models.user import User, UserRole
from app.security.auth import get_password_hash, verify_password, create_access_token, decode_access_token
from app.security.permissions import check_user_role
from fastapi import HTTPException


def test_password_hashing_and_verification():
    pw = "SuperSecurePlannerPass123!"
    h = get_password_hash(pw)
    assert h != pw
    assert verify_password(pw, h) is True
    assert verify_password("WrongPassword", h) is False


def test_jwt_generation_and_decoding():
    data = {"sub": "USR-123", "role": "PLANNER"}
    token = create_access_token(data)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "USR-123"
    assert payload["role"] == "PLANNER"


def test_role_enforcement():
    planner = User(id="1", username="p", email="p@a.com", hashed_password="h", role=UserRole.PLANNER, is_active=True)
    admin = User(id="2", username="a", email="a@a.com", hashed_password="h", role=UserRole.ADMIN, is_active=True)
    auditor = User(id="3", username="aud", email="aud@a.com", hashed_password="h", role=UserRole.AUDITOR, is_active=True)

    # Planner permitted for planner operations
    check_user_role(planner, [UserRole.PLANNER, UserRole.ADMIN])
    check_user_role(admin, [UserRole.PLANNER, UserRole.ADMIN])

    # Auditor denied
    with pytest.raises(HTTPException) as exc:
        check_user_role(auditor, [UserRole.PLANNER, UserRole.ADMIN])
    assert exc.value.status_code == 403
