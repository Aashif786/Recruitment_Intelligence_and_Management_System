from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.domain.models import GlobalSettings, User
from app.domain.schemas import GlobalSettingsUpdate, GlobalSettingsResponse
from app.core.auth import get_current_hr

router = APIRouter(prefix="/api/settings", tags=["settings"])
from fastapi import Request
from app.core.rate_limiter import limiter


def ensure_global_settings_table(db: Session) -> None:
    """Create the settings table on demand for legacy databases."""
    GlobalSettings.__table__.create(bind=db.get_bind(), checkfirst=True)


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
    current_user: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    """Update global settings (HR only)."""
    ensure_global_settings_table(db)
    data = settings_data.model_dump(exclude_unset=True)
    
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
    
    # Return updated settings
    return get_settings(request=request, db=db)
