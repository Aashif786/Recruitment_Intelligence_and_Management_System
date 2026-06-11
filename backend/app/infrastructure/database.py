from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import get_settings

settings = get_settings()

# Create database engine
db_echo = False if settings.env == "production" else settings.debug

db_url = settings.database_url or "sqlite:///./rims.db"

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
        echo=db_echo
    )
else:
    # PgBouncer detection: standard port is 6543 or we can check port/key in URL
    is_pgbouncer = "6543" in db_url or "pgbouncer" in db_url.lower()
    if is_pgbouncer:
        p_size = settings.db_pool_size if settings.db_pool_size is not None else 5
        m_overflow = settings.db_max_overflow if settings.db_max_overflow is not None else 10
    else:
        p_size = settings.db_pool_size if settings.db_pool_size is not None else 10
        m_overflow = settings.db_max_overflow if settings.db_max_overflow is not None else 20

    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=p_size,
        max_overflow=m_overflow,
        pool_recycle=300,    # Recycle connections every 5 minutes (ideal for Supabase/PG poolers)
        echo=db_echo
    )


# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def set_db_identity(db: Session, user_id: int):
    """
    Set PostgreSQL session variable for Row Level Security (RLS).
    Policies in Phase 2 rely on 'app.current_user_id'. (Phase 2 Fix)
    """
    from sqlalchemy import text
    try:
        # RLS is only supported/needed on PostgreSQL (Phase 2 Fix)
        if "postgresql" in str(db.get_bind().url).lower():
            db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": str(user_id)})
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to set RLS identity: {e}")
