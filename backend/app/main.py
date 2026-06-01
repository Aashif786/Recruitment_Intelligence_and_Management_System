import os
import sys
from pathlib import Path

# ── Passlib / bcrypt compatibility patch ──────────────────────────────────────
import importlib
import bcrypt as _bcrypt_mod
if not hasattr(_bcrypt_mod, "__about__"):
    _bcrypt_mod.__about__ = type("_about", (), {"__version__": _bcrypt_mod.__version__})()

_ph = importlib.import_module("passlib.handlers.bcrypt")
_ph.detect_wrap_bug = lambda ident: False
try:
    _ph.bcrypt.set_backend("default")
except Exception:
    pass
# ──────────────────────────────────────────────────────────────────────────────

if os.getenv("BACKEND_START_MODE") not in ["script", "docker"]:
    print("Use start.ps1 to run the backend")
    sys.exit(1)

from fastapi import FastAPI, HTTPException, status, Request as FastAPIRequest
from fastapi.routing import APIRoute
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from typing import Callable, Any
import asyncio
import json
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager

from app.core.auth import hash_password
from app.core.config import get_settings
from app.infrastructure.database import Base, engine
from app.api import auth, jobs, applications, interviews, decisions, notifications, analytics, tickets, support, hr_tickets, ops_email, settings as hr_settings, onboarding, repository
from app.domain.models import (
    User, Job, Application, ResumeExtraction, 
    Interview, InterviewQuestion, InterviewAnswer,
    HiringDecision, Notification,
    ApplicationStage, AuditLog, InterviewReport
)


from app.core.logging_config import setup_logging
from app.core.observability import log_json

settings = get_settings()

if os.environ.get("RIMS_LOGGING_DONE", "0") != "1":
    # Enable file logging in the 'logs' directory
    from pathlib import Path
    logs_dir = Path(__file__).parent.parent / "logs"
    setup_logging(logs_dir, settings.debug)
    os.environ["RIMS_LOGGING_DONE"] = "1"
logger = logging.getLogger(__name__)

settings.validate_config()

# Schema creation: guarded to primary worker only in multi-process deployments.
# BUG-038 Fix: create_all() is disabled in production to prevent accidental schema
# mutations. Production deployments must use 'alembic upgrade head' instead.
if os.environ.get("WORKER_ID", "0") == "0":
    if settings.env != "production":
        Base.metadata.create_all(bind=engine)
    else:
        logger.info(
            "Production mode: Skipping Base.metadata.create_all(). "
            "Run 'alembic upgrade head' to apply schema changes."
        )

# Migration safety: Ensure message_id exists in attachment_resumes
try:
    with engine.connect() as conn:
        from sqlalchemy import text
        from app.migrations import column_exists
        if not column_exists(conn, "attachment_resumes", "message_id"):
            if "postgresql" in str(engine.url):
                conn.execute(text("ALTER TABLE attachment_resumes ADD COLUMN IF NOT EXISTS message_id VARCHAR(255) UNIQUE"))
            else:
                conn.execute(text("ALTER TABLE attachment_resumes ADD COLUMN message_id VARCHAR(255) UNIQUE"))
            conn.commit()
except Exception as e:
    logger.warning(f"Database migration check failed (attachment_resumes.message_id): {e}")

from app.migrations import run_startup_migrations, validate_required_columns
if os.environ.get("WORKER_ID", "0") == "0":
    if os.environ.get("RIMS_STARTUP_MIGRATIONS_DONE", "0") != "1":
        os.environ["RIMS_STARTUP_MIGRATIONS_DONE"] = "1"
        try:
            run_startup_migrations(engine)
            validate_required_columns(engine)
        except RuntimeError as e:
            sys.exit(1)

from app.infrastructure.database import SessionLocal

def bootstrap_super_admin():
    """Idempotently create the super_admin account defined in env config.
    
    BUG-016 Fix: Uses SELECT FOR UPDATE to prevent race conditions in multi-worker
    deployments, and only promotes an existing email user if their email exactly
    matches SUPER_ADMIN_EMAIL (never auto-promotes arbitrary accounts).
    """
    if not settings.super_admin_email or not settings.super_admin_password:
        return
    configured_email = settings.super_admin_email.lower().strip()
    try:
        with SessionLocal() as db:
            from sqlalchemy import text as _text
            # BUG-016 Fix: Lock the row to prevent concurrent promotion races.
            db.execute(_text("SELECT pg_advisory_xact_lock(1919191919)"))

            existing_admin = db.query(User).filter(User.role == "super_admin").first()
            if existing_admin:
                return
            existing_email_user = db.query(User).filter(User.email == configured_email).first()
            if existing_email_user:
                # BUG-016 Fix: Only promote accounts that match the configured email exactly.
                # Never promote untrusted/unverified accounts that were registered normally.
                if existing_email_user.email != configured_email:
                    logger.error(
                        f"BUG-016: Refusing super_admin promotion for mismatched email: {existing_email_user.email}"
                    )
                    return
                existing_email_user.role = "super_admin"
                existing_email_user.is_verified = True
                existing_email_user.is_active = True
                existing_email_user.approval_status = "approved"
                db.commit()
                return
            super_admin = User(
                email=configured_email,
                full_name=settings.super_admin_full_name.strip() or "Super Admin",
                password_hash=hash_password(settings.super_admin_password),
                role="super_admin",
                is_verified=True,
                is_active=True,
                approval_status="approved"
            )
            db.add(super_admin)
            db.commit()
    except Exception as e:
        logger.error(f"Super Admin bootstrap failed: {str(e)}")

bootstrap_super_admin()


from app.core.standardized_route import StandardizedAPIRoute

# ── IMAP Email Polling Background Task ─────────────────────────────────────
from app.services.email_ingestion_service import fetch_resume_attachments
from app.core.encryption import decrypt_field

async def _imap_polling_loop():
    """Background coroutine that polls the IMAP inbox for resume attachments.

    Uses a database-backed distributed lock to ensure only one worker runs
    the ingestion loop at any given time, eliminating the worker age check
    which causes stalls on worker crashes.
    
    BUG-007 Fix: Exponential backoff circuit breaker — after 3 consecutive
    failures, sleep is increased up to 30 minutes to avoid hammering a broken
    IMAP server. On success, the backoff counter resets to zero.
    """
    import uuid
    _consecutive_failures = 0
    _max_backoff_seconds = 1800  # 30 minutes cap
    _base_sleep_seconds = 60     # Normal poll interval
    
    polling_instance_id = str(uuid.uuid4())
    
    while True:
        db = None
        lock_acquired = False
        lock_token = None
        sleep_seconds = _base_sleep_seconds
        try:
            db = SessionLocal()

            # Ensure lock key exists in global_settings
            from app.domain.models import GlobalSettings
            lock_record = db.query(GlobalSettings).filter(GlobalSettings.key == "imap_polling_lock").first()
            if not lock_record:
                try:
                    lock_record = GlobalSettings(key="imap_polling_lock", value="")
                    db.add(lock_record)
                    db.commit()
                except Exception:
                    db.rollback()

            # Acquire lock via SELECT FOR UPDATE inside a transaction block
            db.begin()
            lock_record = db.query(GlobalSettings).filter(GlobalSettings.key == "imap_polling_lock").with_for_update().first()
            
            now_epoch = time.time()
            is_locked = False
            
            if lock_record and lock_record.value:
                try:
                    val_parts = lock_record.value.split(":")
                    if len(val_parts) == 2:
                        val_instance, val_time_str = val_parts
                        locked_time = float(val_time_str)
                        # Lock expires after 5 minutes
                        if now_epoch - locked_time < 300:
                            is_locked = True
                except ValueError:
                    pass

            if is_locked:
                db.rollback()
                db.close()
                await asyncio.sleep(sleep_seconds)
                continue

            # Acquire the lock
            lock_token = f"{polling_instance_id}:{now_epoch}"
            if lock_record:
                lock_record.value = lock_token
                db.commit()
                lock_acquired = True
            else:
                db.rollback()

            # Fetch global settings from DB
            settings_records = db.query(GlobalSettings).all()
            settings_dict = {s.key: s.value for s in settings_records}

            auto_sync_enabled = settings_dict.get("auto_sync_enabled", "false").lower() == "true"

            if auto_sync_enabled:
                imap_email = settings_dict.get("imap_email") or settings.imap_email or ''
                raw_pass = settings_dict.get("imap_password") or settings.imap_password or ''
                imap_password = decrypt_field(raw_pass).strip()

                if imap_email and imap_password:
                    fetch_resume_attachments(db, imap_email, imap_password)
                else:
                    logger.info("IMAP auto-sync skipped: IMAP credentials are not configured.")

                from app.services.email_ingestion_service import run_batch_resume_processing
                await run_batch_resume_processing(db)
            
            # Record success timestamp and reset circuit breaker
            app.state.imap_last_success = time.time()
            app.state.imap_last_error = None
            _consecutive_failures = 0
            sleep_seconds = _base_sleep_seconds
        except Exception as e:
            _consecutive_failures += 1
            logger.error(f"IMAP Polling Error (failure #{_consecutive_failures}): {e}")
            # Record error
            app.state.imap_last_error = str(e)
            app.state.imap_last_error_time = time.time()
            # BUG-007: Exponential backoff after repeated failures
            sleep_seconds = min(
                _base_sleep_seconds * (2 ** (_consecutive_failures - 1)),
                _max_backoff_seconds
            )
            if _consecutive_failures >= 3:
                logger.warning(
                    f"[IMAP CIRCUIT BREAKER] {_consecutive_failures} consecutive failures. "
                    f"Backing off for {sleep_seconds}s before next attempt."
                )
        finally:
            if lock_acquired and db is not None:
                try:
                    # Release lock: verify token matches before clearing to prevent overwrites
                    lock_record = db.query(GlobalSettings).filter(GlobalSettings.key == "imap_polling_lock").with_for_update().first()
                    if lock_record and lock_record.value == lock_token:
                        lock_record.value = ""
                        db.commit()
                    else:
                        db.rollback()
                except Exception as rel_err:
                    logger.error(f"Failed to release IMAP polling lock: {rel_err}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass

        await asyncio.sleep(sleep_seconds)


@asynccontextmanager
async def lifespan(app):
    """Application lifespan: manages background tasks on startup/shutdown."""
    # Startup — start IMAP polling loop on all workers; database lock handles concurrency.
    polling_task = asyncio.create_task(_imap_polling_loop())
    logger.info("IMAP polling loop task spawned on this worker.")

    yield  # ── Application runs here ──

    # Shutdown — cleanly cancel the polling task.
    if polling_task is not None:
        polling_task.cancel()
        try:
            await polling_task
        except asyncio.CancelledError:
            pass
        logger.info("IMAP polling loop stopped.")


app = FastAPI(
    title="HR Recruitment System API",
    description="AI-powered automated recruitment platform",
    version="1.0.0",
    redirect_slashes=False,
    lifespan=lifespan,
    docs_url="/docs" if settings.env != "production" else None,
    redoc_url="/redoc" if settings.env != "production" else None,
    openapi_url="/openapi.json" if settings.env != "production" else None,
)
app.router.route_class = StandardizedAPIRoute



import time
app.state.start_time = time.time()

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter

def cors_aware_rate_limit_handler(request: FastAPIRequest, exc: RateLimitExceeded):
    response = _rate_limit_exceeded_handler(request, exc)
    origin = request.headers.get("origin")
    if not origin and settings.env == "development":
        origin = settings.frontend_base_url
    allowed_origins = settings.get_allowed_origins()
    if origin and (origin in allowed_origins or "*" in allowed_origins or settings.env == "development"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, cors_aware_rate_limit_handler)


from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
# BUG-028 Fix: Restrict trusted_hosts to the actual reverse proxy IP/host.
# Using "*" or broad CIDR ranges allows X-Forwarded-For spoofing from arbitrary clients.
# We fetch this dynamically from environment variables for production security.
_trusted_proxies_env = os.environ.get("TRUSTED_PROXY_HOST")
if _trusted_proxies_env:
    trusted_proxy_hosts = [ip.strip() for ip in _trusted_proxies_env.split(",") if ip.strip()]
else:
    # Safe default: loopback only
    trusted_proxy_hosts = ["127.0.0.1"]
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=trusted_proxy_hosts)

from app.core.middleware import PerformanceLoggingMiddleware, SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(PerformanceLoggingMiddleware)

allowed_origins = list(set(settings.get_allowed_origins()))
if settings.env == "development":
    allowed_origins = list(set(allowed_origins + ["http://localhost:3000", "http://127.0.0.1:3000"]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["System"])
def health_check():
    uptime_seconds = round(time.time() - app.state.start_time, 2)
    db_status = "ok"
    try:
        from sqlalchemy import text
        from app.infrastructure.database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "error"
    
    redis_status = "not_configured"
    if settings.redis_url:
        try:
            from app.core.redis_store import get_redis_client
            redis_client = get_redis_client()
            if redis_client:
                redis_client.ping()
                redis_status = "ok"
            else:
                redis_status = "unavailable"
        except Exception:
            redis_status = "error"
    
    supabase_status = "not_configured"
    if settings.supabase_url:
        try:
            from app.core.storage import get_supabase_client
            client = get_supabase_client()
            if client:
                client.table("users").select("id").limit(1).execute()
                supabase_status = "ok"
            else:
                supabase_status = "unavailable"
        except Exception:
            supabase_status = "error"
    
    rate_limiter_status = "active" if getattr(app.state, "limiter", None) else "inactive"
    
    imap_status = "not_running"
    if os.environ.get("WORKER_ID", "0") == "0":
        last_success = getattr(app.state, "imap_last_success", 0)
        last_error_time = getattr(app.state, "imap_last_error_time", 0)
        
        if last_error_time > last_success:
            imap_status = f"error: {getattr(app.state, 'imap_last_error', 'unknown')}"
        elif time.time() - last_success > 300 and last_success > 0:
            imap_status = "stuck_or_delayed"
        else:
            imap_status = "ok"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime_seconds,
        "services": {
            "database": db_status,
            "redis": redis_status,
            "supabase": supabase_status,
            "rate_limit": rate_limiter_status,
            "imap_polling": imap_status
        }
    }

@app.get("/", tags=["System"])
def root():
    return {
        "success": True,
        "data": {
            "message": "HR Recruitment System API",
            "version": "1.0.0",
            "docs": "/docs"
        },
        "error": None
    }

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(interviews.router)
app.include_router(decisions.router)
app.include_router(notifications.router)
app.include_router(tickets.router)
app.include_router(support.router)
app.include_router(hr_tickets.router)
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ops_email.router)
app.include_router(hr_settings.router)
app.include_router(onboarding.router)
app.include_router(repository.router)


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: FastAPIRequest, exc: RequestValidationError):
    errs = exc.errors()
    response = JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error": "Validation failed: " + "; ".join([f"{e['loc'][-1]}: {e['msg']}" for e in errs])
        }
    )
    origin = request.headers.get("origin")
    allowed_origins = settings.get_allowed_origins()
    if origin and (origin in allowed_origins or "*" in allowed_origins or settings.env == "development"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: FastAPIRequest, exc: HTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": exc.detail
        }
    )
    origin = request.headers.get("origin")
    allowed_origins = settings.get_allowed_origins()
    if origin and (origin in allowed_origins or "*" in allowed_origins or settings.env == "development"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: FastAPIRequest, exc: SQLAlchemyError):
    logger.error(f"DATABASE ERROR: {str(exc)}")
    response = JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": "Database error occurred"
        }
    )
    origin = request.headers.get("origin")
    allowed_origins = settings.get_allowed_origins()
    if origin and (origin in allowed_origins or "*" in allowed_origins or settings.env == "development"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request: FastAPIRequest, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    error_msg = f"[GLOBAL EXCEPTION] Unhandled error: {str(exc)}\n{error_trace}"
    logger.error(error_msg)
    
    detail = str(exc) if settings.debug else "An unexpected internal server error occurred."
    response = JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": detail
        }
    )
    origin = request.headers.get("origin")
    allowed_origins = settings.get_allowed_origins()
    if origin and (origin in allowed_origins or "*" in allowed_origins or settings.env == "development"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


#
# Note:
# This module must NOT start a server itself.
# Entrypoint is enforced via `start.ps1` and `BACKEND_START_MODE=script`.
