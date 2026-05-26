#!/usr/bin/env python3
"""
Smoke-check for HR reports / analytics module (no pytest required).

Usage (from backend/):
  set BACKEND_START_MODE=script
  python scripts/verify_reports_module.py
"""
from __future__ import annotations

import os
import sys

# Minimal env so app modules import without a real database
os.environ.setdefault("BACKEND_START_MODE", "script")
os.environ.setdefault("ENV", "development")
os.environ.setdefault("DATABASE_URL", "postgresql://localhost:5432/rims_verify")
os.environ.setdefault("JWT_SECRET", "verify" * 8)
os.environ.setdefault("ENCRYPTION_KEY", "dGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXk=")

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)


def main() -> int:
    errors: list[str] = []

    print("-> Importing analytics API ...")
    try:
        from app.api import analytics as analytics_module
        from app.api.analytics import _hr_can_see_application, router
    except Exception as exc:
        print(f"FAIL import: {exc}")
        return 1

    routes = [getattr(r, "path", "") for r in router.routes]
    required = {"/reports", "/dashboard", "/interviews", "/config/skills"}
    missing = required - set(routes)
    if missing:
        errors.append(f"Missing routes: {missing}")

    if _hr_can_see_application is None:
        pass
    else:
        print("-> HR scope helper present")

    print("-> Compiling analytics module ...")
    import py_compile

    py_compile.compile(
        os.path.join(BACKEND_ROOT, "app", "api", "analytics.py"),
        doraise=True,
    )

    if errors:
        for err in errors:
            print(f"FAIL {err}")
        return 1

    print("OK — reports/analytics module imports and routes look valid.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
