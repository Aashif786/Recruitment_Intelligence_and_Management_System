from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db, SessionLocal
from app.domain.models import GlobalSettings, User
from app.domain.schemas import GlobalSettingsUpdate, GlobalSettingsResponse
from app.core.auth import get_current_hr
from app.services.email_ingestion_service import fetch_resume_attachments, run_batch_resume_processing
import imaplib
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])
from fastapi import Request
from app.core.rate_limiter import limiter


def ensure_global_settings_table(db: Session) -> None:
    """Create the settings table on demand for legacy databases."""
    GlobalSettings.__table__.create(bind=db.get_bind(), checkfirst=True)


def _verify_imap_credentials(email: str, password: str) -> dict:
    """Test IMAP connection to Gmail. Returns {"ok": True} or {"ok": False, "error": "..."}."""
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=15)
        try:
            mail.login(email, password)
            mail.logout()
            return {"ok": True}
        except imaplib.IMAP4.error as e:
            return {
                "ok": False,
                "error": f"Authentication failed. Please check your email and App Password. ({e})"
            }
        except Exception as e:
            return {"ok": False, "error": f"IMAP login error: {e}"}
    except Exception as e:
        return {"ok": False, "error": f"Could not connect to Gmail IMAP server: {e}"}


@router.get("", response_model=GlobalSettingsResponse)
@limiter.limit("60/minute")
def get_settings(
    request: Request, db: Session = Depends(get_db)
):
    """Fetch global settings (public - used for branding on login/register pages)."""
    ensure_global_settings_table(db)
    settings_records = db.query(GlobalSettings).all()
    settings_dict = {s.key: s.value for s in settings_records}
    
    from app.core.branding import get_all_branding
    branding = get_all_branding(db)
    
    from app.core.auth import get_current_user
    has_sensitive_access = False
    try:
        user = get_current_user(request, db)
        if user and user.role in {"super_admin", "hr"} and user.approval_status == "approved" and user.is_active:
            has_sensitive_access = True
    except Exception:
        pass

    return {
        "company_logo_url": branding.get("company_logo_url"),
        "company_name": branding.get("company_name"),
        "company_address": settings_dict.get("company_address", ""),
        "hr_email": settings_dict.get("hr_email", ""),
        "hr_name": settings_dict.get("hr_name", ""),
        "hr_phone": settings_dict.get("hr_phone", ""),
        "offer_letter_template": settings_dict.get("offer_letter_template", "") if has_sensitive_access else "",
        "imap_email": settings_dict.get("imap_email", "") if has_sensitive_access else "",
        "imap_password": settings_dict.get("imap_password", "") if has_sensitive_access else "",
        "auto_sync_enabled": (settings_dict.get("auto_sync_enabled", "false").lower() == "true") if has_sensitive_access else False,
        
        "product_name": branding.get("product_name"),
        "dark_logo_url": branding.get("dark_logo_url"),
        "favicon_url": branding.get("favicon_url"),
        "footer_text": branding.get("footer_text"),
        "support_email": branding.get("support_email"),
        "theme_color": branding.get("theme_color"),
        "terms_url": branding.get("terms_url"),
        "privacy_url": branding.get("privacy_url"),
        "seo_title_default": branding.get("seo_title_default"),
        "seo_description_default": branding.get("seo_description_default")
    }

@router.post("", response_model=GlobalSettingsResponse)
@limiter.limit("60/minute")
def update_settings(
    request: Request, settings_data: GlobalSettingsUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    """Update global settings (HR only)."""
    ensure_global_settings_table(db)
    data = settings_data.model_dump(exclude_unset=True)
    
    # ── IMAP credential verification ──────────────────────────────────
    # If the user is setting/changing IMAP email or password, verify the
    # credentials actually work before persisting them.
    imap_email_new = data.get("imap_email")
    imap_password_new = data.get("imap_password")
    
    if imap_email_new or imap_password_new:
        # Resolve the full pair: use new value if provided, else fall back to DB
        existing = {s.key: s.value for s in db.query(GlobalSettings).all()}
        email_to_test = (imap_email_new or existing.get("imap_email", "")).strip()
        password_to_test = (imap_password_new or existing.get("imap_password", "")).strip()
        
        if email_to_test and password_to_test:
            result = _verify_imap_credentials(email_to_test, password_to_test)
            if not result["ok"]:
                logger.warning(
                    "IMAP credential verification failed for %s: %s",
                    email_to_test, result["error"]
                )
                raise HTTPException(
                    status_code=422,
                    detail=result["error"]
                )
    # ──────────────────────────────────────────────────────────────────
    
    for key, value in data.items():
        if value is None:
            continue
            
        str_value = str(value)
        if isinstance(value, bool):
            str_value = "true" if value else "false"
            
        setting = db.query(GlobalSettings).filter(GlobalSettings.key == key).first()
        if setting:
            setting.value = str_value
        else:
            setting = GlobalSettings(key=key, value=str_value)
            db.add(setting)
            
    db.commit()

    # Trigger immediate sync in background if auto_sync_enabled was toggled ON (or updated while True)
    if data.get("auto_sync_enabled") is True:
        async def run_sync_in_background():
            bg_db = SessionLocal()
            try:
                # Retrieve fully resolved credentials from DB
                existing = {s.key: s.value for s in bg_db.query(GlobalSettings).all()}
                email = existing.get("imap_email", "").strip()
                password = existing.get("imap_password", "").strip()
                if email and password:
                    fetch_resume_attachments(bg_db, email, password)
                    await run_batch_resume_processing(bg_db)
            except Exception as e:
                logger.error(f"Immediate background sync on setting save failed: {e}")
            finally:
                bg_db.close()
        background_tasks.add_task(run_sync_in_background)
    
    # Return updated settings
    return get_settings(request=request, db=db)

