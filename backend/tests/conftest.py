"""
conftest.py — Shared test fixtures for RIMS backend unit tests.

Sets up:
 - In-memory SQLite engine (isolated, no real DB needed)
 - Overrides FastAPI dependency injection for DB sessions
 - Provides ready-made model instances (User, Job, Application, Interview)
 - Patches encryption / settings for hermetic tests
"""

import os
import pytest
from unittest.mock import MagicMock, patch
from cryptography.fernet import Fernet

# ──────────────────────────────────────────────────────────────────────────────
# 1.  Environment bootstrap BEFORE any app import
# ──────────────────────────────────────────────────────────────────────────────

# Generate a valid Fernet key for test encryption
_TEST_FERNET_KEY = Fernet.generate_key().decode()

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-unit-tests")
os.environ.setdefault("ENCRYPTION_KEY", _TEST_FERNET_KEY)
os.environ.setdefault("ENV", "test")
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-supabase-key")
os.environ.setdefault("GROQ_API_KEY", "gsk_fake_groq_key")
os.environ.setdefault("FRONTEND_BASE_URL", "http://localhost:3000")

# ──────────────────────────────────────────────────────────────────────────────
# 2.  SQLAlchemy in-memory engine + session
# ──────────────────────────────────────────────────────────────────────────────

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# We use SQLite with check_same_thread=False so pytest workers share the engine.
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)

# SQLite doesn't enforce FK constraints by default — enable them.
@event.listens_for(TEST_ENGINE, "connect")
def _set_sqlite_pragma(dbapi_conn, _record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


# ──────────────────────────────────────────────────────────────────────────────
# 3.  Create all tables once per test session
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all ORM tables in the in-memory SQLite DB once per session."""
    from app.infrastructure.database import Base
    # Import all models so their metadata is registered
    import app.domain.models  # noqa: F401
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


# ──────────────────────────────────────────────────────────────────────────────
# 4.  Per-test DB session (transaction rollback for isolation)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture()
def db_session(create_tables):
    """
    Yields a SQLAlchemy session scoped to a single test.
    All changes are rolled back after each test for full isolation.
    """
    connection = TEST_ENGINE.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


# ──────────────────────────────────────────────────────────────────────────────
# 5.  FastAPI test client with overridden DB dependency
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture()
def client(db_session):
    """FastAPI TestClient with DB dependency overridden to the test session."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.infrastructure.database import get_db

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


# ──────────────────────────────────────────────────────────────────────────────
# 6.  Model factory fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture()
def sample_hr_user(db_session):
    """Persist and return a basic HR User record."""
    from app.domain.models import User
    from passlib.context import CryptContext

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = User(
        email="hr@testcompany.com",
        password_hash=pwd_ctx.hash("HrPassword1!"),
        full_name="Test HR Manager",
        role="hr",
        is_active=True,
        is_verified=True,
        approval_status="approved",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def sample_candidate_user(db_session):
    """Persist and return a basic Candidate User record."""
    from app.domain.models import User
    from passlib.context import CryptContext

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = User(
        email="candidate@example.com",
        password_hash=pwd_ctx.hash("CandPassword1!"),
        full_name="Test Candidate",
        role="candidate",
        is_active=True,
        is_verified=True,
        approval_status="approved",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def sample_job(db_session, sample_hr_user):
    """Persist and return a sample open Job record."""
    from app.domain.models import Job

    job = Job(
        title="Software Engineer",
        description="Build and maintain scalable web applications.",
        experience_level="mid",
        location="Remote",
        status="open",
        hr_id=sample_hr_user.id,
        aptitude_enabled=False,
        first_level_enabled=True,
        duration_minutes=60,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture()
def sample_application(db_session, sample_job):
    """Persist and return a sample Application record (status=applied)."""
    from app.domain.models import Application

    app_record = Application(
        job_id=sample_job.id,
        hr_id=sample_job.hr_id,
        candidate_name="Jane Applicant",
        candidate_email="jane@example.com",
        resume_file_name="jane_resume.pdf",
        resume_file_path="/resumes/jane_resume.pdf",
        status="applied",
        resume_status="parsed",
        resume_score=75.0,
    )
    db_session.add(app_record)
    db_session.commit()
    db_session.refresh(app_record)
    return app_record


@pytest.fixture()
def sample_interview(db_session, sample_application):
    """Persist and return a sample Interview (status=not_started)."""
    from app.domain.models import Interview

    interview = Interview(
        application_id=sample_application.id,
        status="not_started",
        total_questions=10,
        questions_asked=0,
        interview_stage="first_level",
        duration_minutes=60,
    )
    db_session.add(interview)
    db_session.commit()
    db_session.refresh(interview)
    return interview


# ──────────────────────────────────────────────────────────────────────────────
# 7.  Auth token helpers
# ──────────────────────────────────────────────────────────────────────────────

def _make_token(user_id: int, role: str) -> str:
    """Generate a valid JWT for tests without calling FastAPI endpoints."""
    from jose import jwt
    import datetime

    secret = os.environ["JWT_SECRET"]
    now = datetime.datetime.utcnow()
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(hours=1),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture()
def hr_auth_headers(sample_hr_user):
    token = _make_token(sample_hr_user.id, "hr")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def candidate_auth_headers(sample_candidate_user):
    token = _make_token(sample_candidate_user.id, "candidate")
    return {"Authorization": f"Bearer {token}"}
