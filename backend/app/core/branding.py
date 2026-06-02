import os
from sqlalchemy.orm import Session
from app.domain.models import GlobalSettings

BRANDING_DEFAULTS = {
    "company_name": "Caldim Engineering",
    "product_name": "CAL-RIMS",
    "company_logo_url": "/calrims/logo.png",
    "dark_logo_url": "/calrims/logo-dark.png",
    "favicon_url": "/calrims/logo.png",
    "footer_text": "Powered by Caldim Engineering. Built for teams who care about who they hire.",
    "support_email": "support@caldimproducts.com",
    "theme_color": "#2563eb",
    "terms_url": "/calrims/terms/",
    "privacy_url": "/calrims/privacy/",
    "seo_title_default": "CAL-RIMS - AI-Powered Recruitment Intelligence System",
    "seo_description_default": "CAL-RIMS is an AI-powered automated recruitment platform for seamless hiring, empowering teams to find, evaluate, and hire top-tier talent efficiently."
}

def get_branding_value(db: Session, key: str) -> str:
    """
    Get a branding configuration value.
    Precedence:
    1. Database `global_settings` table
    2. Environment variable (uppercase version of the key)
    3. Default value constant
    """
    # 1. Try DB
    try:
        setting = db.query(GlobalSettings).filter(GlobalSettings.key == key).first()
        if setting and setting.value is not None and setting.value not in ("[UNREADABLE]", "[DECRYPTION_ERROR]"):
            return setting.value
    except Exception:
        pass

    # 2. Try Environment Variable
    env_key = key.upper()
    env_val = os.getenv(env_key)
    if env_val is not None:
        return env_val

    # 3. Fallback to hardcoded default
    return BRANDING_DEFAULTS.get(key, "")

def get_all_branding(db: Session) -> dict:
    """
    Retrieve all branding configuration values with fallback.
    """
    # Load all settings from database to minimize queries
    db_settings = {}
    try:
        settings_records = db.query(GlobalSettings).all()
        db_settings = {s.key: s.value for s in settings_records}
    except Exception:
        pass

    branding = {}
    for key, default_val in BRANDING_DEFAULTS.items():
        # Precedence: DB -> Env -> Default
        val = db_settings.get(key)
        if val in ("[UNREADABLE]", "[DECRYPTION_ERROR]"):
            val = None
        if val is None or val == "":
            val = os.getenv(key.upper())
        if val is None or val == "":
            val = default_val
        branding[key] = val

    return branding
