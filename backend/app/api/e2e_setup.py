"""
Dev-only E2E test setup endpoint.
Creates / ensures test fixtures (HR user, etc.) exist before Playwright runs.
This router is ONLY registered when env != 'production'.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.domain.models import User
from app.core.auth import hash_password
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/test-setup", tags=["test-setup"])

E2E_HR_EMAIL    = "hr_automated_test@example.com"
E2E_HR_PASSWORD = "Password123!"
E2E_HR_NAME     = "Automated HR Tester"


@router.post("/hr-user", response_model=dict)
def ensure_hr_test_user(db: Session = Depends(get_db)):
    """
    Idempotent: creates (or re-activates) the E2E test HR account.
    Always returns 200 with the user state so Playwright setup can verify it.
    """
    user = db.query(User).filter(User.email == E2E_HR_EMAIL).first()

    if user:
        # Re-activate / fix approval status so login always works
        user.password_hash   = hash_password(E2E_HR_PASSWORD)
        user.role            = "hr"
        user.is_active       = True
        user.is_verified     = True
        user.approval_status = "approved"
        user.otp_code        = None
        user.otp_expiry      = None
    else:
        user = User(
            email           = E2E_HR_EMAIL,
            full_name       = E2E_HR_NAME,
            password_hash   = hash_password(E2E_HR_PASSWORD),
            role            = "hr",
            is_active       = True,
            is_verified     = True,
            approval_status = "approved",
        )
        db.add(user)

    try:
        db.commit()
        db.refresh(user)
        return {
            "status": "ok",
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Test setup failed: {e}")


@router.delete("/hr-user", response_model=dict)
def cleanup_hr_test_user(db: Session = Depends(get_db)):
    """Optional teardown: deactivate the test HR user after the suite."""
    user = db.query(User).filter(User.email == E2E_HR_EMAIL).first()
    if user:
        user.is_active = False
        db.commit()
    return {"status": "cleaned_up", "email": E2E_HR_EMAIL}
