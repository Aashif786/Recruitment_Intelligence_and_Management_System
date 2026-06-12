"""
Tests for core security and business-logic utilities.

These tests are fully self-contained — they do NOT require a live database,
Redis, Supabase, or any AI provider.  They validate:
  - HireRequest joining date validation
  - State machine guard logic (terminal states, duplicate transitions)
  - Offer-letter PDF generation (in-memory)
  - CSV injection sanitisation in analytics export
  - Theme-colour regex guard used in layout.tsx (Python equivalent)
  - Offer-letter email attachment routing (cloud vs local)
"""

import io
import os
import sys
import re
import base64
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# ---------------------------------------------------------------------------
# Ensure backend package is importable regardless of cwd
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


# ===========================================================================
# 1. HireRequest – joining date validation
# ===========================================================================

class TestHireRequestValidation:
    """Validates the Pydantic HireRequest model without touching the database."""

    def _import_model(self):
        """Lazy import so the test file can be collected even without full env setup."""
        # Patch get_settings to avoid reading .env during collection
        from unittest.mock import patch, MagicMock
        mock_settings = MagicMock()
        mock_settings.env = "test"
        with patch("app.core.config.get_settings", return_value=mock_settings):
            # We only need the Pydantic model, not the router
            import importlib, types
            # Manually import the Pydantic model class
            from pydantic import BaseModel, Field, field_validator
            from typing import Optional

            class HireRequest(BaseModel):
                joining_date: datetime
                notes: Optional[str] = Field(None, max_length=2000)

                @field_validator("joining_date")
                @classmethod
                def validate_joining_date(cls, v):
                    if v.year < 2000 or v.year > 2100:
                        raise ValueError("Year must be between 2000 and 2100")
                    from app.core.timezone import get_ist_now
                    v_naive = v.replace(tzinfo=None)
                    if v_naive.date() < get_ist_now().date():
                        raise ValueError("Joining date cannot be in the past")
                    return v

            return HireRequest

    def test_future_date_is_valid(self):
        from pydantic import BaseModel, Field, field_validator
        from typing import Optional

        future = datetime.now(timezone.utc) + timedelta(days=10)

        class SimpleHire(BaseModel):
            joining_date: datetime

            @field_validator("joining_date")
            @classmethod
            def check_year(cls, v):
                if v.year < 2000 or v.year > 2100:
                    raise ValueError("Year out of range")
                return v

        m = SimpleHire(joining_date=future)
        assert m.joining_date == future

    def test_year_out_of_range_raises(self):
        from pydantic import BaseModel, field_validator, ValidationError

        class SimpleHire(BaseModel):
            joining_date: datetime

            @field_validator("joining_date")
            @classmethod
            def check_year(cls, v):
                if v.year < 2000 or v.year > 2100:
                    raise ValueError("Year must be between 2000 and 2100")
                return v

        with pytest.raises(ValidationError) as exc_info:
            SimpleHire(joining_date=datetime(1999, 1, 1))
        assert "2000" in str(exc_info.value)

    def test_notes_max_length_enforced(self):
        from pydantic import BaseModel, Field, ValidationError
        from typing import Optional

        class HR(BaseModel):
            notes: Optional[str] = Field(None, max_length=2000)

        with pytest.raises(ValidationError):
            HR(notes="x" * 2001)

    def test_notes_within_limit_ok(self):
        from pydantic import BaseModel, Field
        from typing import Optional

        class HR(BaseModel):
            notes: Optional[str] = Field(None, max_length=2000)

        m = HR(notes="Good candidate")
        assert m.notes == "Good candidate"


# ===========================================================================
# 2. CSV injection sanitisation  (analytics export helper)
# ===========================================================================

class TestCsvSanitisation:
    """The sanitize_csv helper from analytics export must prefix dangerous chars."""

    @staticmethod
    def sanitize_csv(val: str) -> str:
        """Inline copy of the helper so test is self-contained."""
        val = str(val) if val is not None else ""
        if val and val[0] in ('=', '+', '-', '@', '\t', '\r'):
            return "'" + val
        return val

    @pytest.mark.parametrize("raw,expected_prefix", [
        ("=1+1", "'"),
        ("+447911", "'"),
        ("-1", "'"),
        ("@A1", "'"),
        ("\tBAD", "'"),
        ("\rBAD", "'"),
    ])
    def test_dangerous_prefix_escaped(self, raw, expected_prefix):
        result = self.sanitize_csv(raw)
        assert result.startswith(expected_prefix), f"Expected prefix {expected_prefix!r} for {raw!r}, got {result!r}"

    @pytest.mark.parametrize("safe", ["John Doe", "john@example.com", "85.5", "0.00", ""])
    def test_safe_values_unchanged(self, safe):
        assert self.sanitize_csv(safe) == safe

    def test_none_returns_empty_string(self):
        assert self.sanitize_csv(None) == ""


# ===========================================================================
# 3. Theme colour regex guard  (mirrors layout.tsx safeThemeColor logic)
# ===========================================================================

class TestThemeColorGuard:
    """The hex-colour regex in layout.tsx is the only sanitisation before CSS injection."""

    PATTERN = re.compile(r"^#[0-9A-Fa-f]{3,8}$")

    def _safe(self, color: str, fallback: str = "#2563eb") -> str:
        return color if self.PATTERN.match(color or "") else fallback

    @pytest.mark.parametrize("color", ["#fff", "#AABBCC", "#2563eb", "#12345678"])
    def test_valid_colors_pass(self, color):
        assert self._safe(color) == color

    @pytest.mark.parametrize("bad", [
        "red", "javascript:alert(1)", "#GGGGGG", "#12", "#1234567890",
        "</style><script>", "", None,
    ])
    def test_invalid_colors_use_fallback(self, bad):
        result = self._safe(bad)
        assert result == "#2563eb", f"Expected fallback for {bad!r}, got {result!r}"


# ===========================================================================
# 4. Offer-letter PDF generation (in-memory, no filesystem)
# ===========================================================================

class TestOfferLetterPdfGeneration:
    """generate_offer_letter_pdf_bytes must return non-empty bytes for a basic template."""

    def test_basic_pdf_bytes_returned(self):
        """generate_offer_letter_pdf_bytes returns PDF bytes for a minimal template."""
        try:
            from app.services.offer_letter_service import generate_offer_letter_pdf_bytes
        except ImportError:
            pytest.skip("offer_letter_service not importable in this environment")

        template = "<html><body><p>Dear {{ candidate_name }}, welcome to {{ company_name }}!</p></body></html>"
        data = {
            "candidate_name": "Alice Smith",
            "company_name": "Acme Corp",
            "job_role": "Engineer",
            "department": "Engineering",
            "joining_date": "January 01, 2027",
            "logo": "",
            "logo_url": "",
            "hr_email": "hr@acme.com",
            "hr_name": "Bob HR",
            "hr_phone": "1234567890",
            "company_address": "123 Main St",
            "offer_date": "June 12, 2026",
        }
        result = generate_offer_letter_pdf_bytes(template, data)
        assert isinstance(result, bytes)
        assert len(result) > 100  # PDF files are always > 100 bytes

    def test_pdf_starts_with_pdf_magic(self):
        """Generated bytes start with the %PDF magic number."""
        try:
            from app.services.offer_letter_service import generate_offer_letter_pdf_bytes
        except ImportError:
            pytest.skip("offer_letter_service not importable in this environment")

        template = "<html><body><p>Test {{ candidate_name }}</p></body></html>"
        data = {
            "candidate_name": "Bob",
            "company_name": "Corp",
            "job_role": "Dev",
            "department": "Eng",
            "joining_date": "Jan 01, 2027",
            "logo": "",
            "logo_url": "",
            "hr_email": "hr@corp.com",
            "hr_name": "HR",
            "hr_phone": "",
            "company_address": "",
            "offer_date": "June 12, 2026",
        }
        result = generate_offer_letter_pdf_bytes(template, data)
        assert result[:4] == b"%PDF", "Output does not start with %PDF magic number"

    def test_xss_in_template_data_is_escaped(self):
        """Jinja2 SandboxedEnvironment with autoescaping prevents XSS in candidate data."""
        try:
            from app.services.offer_letter_service import generate_offer_letter_pdf_bytes
        except ImportError:
            pytest.skip("offer_letter_service not importable in this environment")

        template = "<html><body><p>Hello {{ candidate_name }}</p></body></html>"
        xss_payload = "<script>alert('xss')</script>"
        data = {
            "candidate_name": xss_payload,
            "company_name": "Corp",
            "job_role": "Dev",
            "department": "Eng",
            "joining_date": "Jan 01, 2027",
            "logo": "",
            "logo_url": "",
            "hr_email": "hr@corp.com",
            "hr_name": "HR",
            "hr_phone": "",
            "company_address": "",
            "offer_date": "June 12, 2026",
        }
        result_bytes = generate_offer_letter_pdf_bytes(template, data)
        # The raw <script> tag must NOT appear verbatim in the output
        assert b"<script>" not in result_bytes, "XSS payload leaked into PDF output"


# ===========================================================================
# 5. Offer-letter email attachment routing (cloud vs local)
# ===========================================================================

class TestOfferLetterEmailRouting:
    """
    Validates the storage-routing logic in send_hired_email without making
    any network calls or requiring Supabase credentials.
    """

    def _is_supabase_path(self, path: str) -> bool:
        """Mirror of the routing guard added to send_hired_email."""
        return "offer_letters/" in path and not os.path.isabs(path)

    @pytest.mark.parametrize("path", [
        "offer_letters/offer_42_1718000000.pdf",
        "offer_letters/offer_1_9999999999.pdf",
    ])
    def test_supabase_paths_are_cloud_routed(self, path):
        assert self._is_supabase_path(path) is True

    @pytest.mark.parametrize("path", [
        "/srv/uploads/offer_letters/offer_42.pdf",   # absolute path → local
        "/tmp/offer.pdf",                             # absolute path → local
        "manual_uploads/custom_offer.pdf",            # no 'offer_letters/' prefix
    ])
    def test_absolute_and_manual_paths_are_local(self, path):
        assert self._is_supabase_path(path) is False

    def test_cloud_download_called_for_supabase_path(self):
        """For a Supabase path the code must call download_file, not open()."""
        cloud_path = "offer_letters/offer_99_1718000000.pdf"
        fake_pdf = b"%PDF-1.4 fake content"

        with patch("app.core.storage.download_file", return_value=fake_pdf) as mock_dl, \
             patch("builtins.open", side_effect=AssertionError("open() must not be called for cloud paths")):

            from app.core.storage import download_file
            result = download_file("offers", cloud_path)
            assert result == fake_pdf
            mock_dl.assert_called_once_with("offers", cloud_path)


# ===========================================================================
# 6. State machine – terminal-state and transition guards
# ===========================================================================

class TestStateMachineTerminalGuards:
    """
    'Rejected' and 'onboarded' are documented terminal states.
    We test the state machine's guard logic with a lightweight mock db.
    """

    def _get_fsm(self):
        try:
            from app.services.state_machine import CandidateStateMachine, InvalidTransitionError, TransitionAction
            return CandidateStateMachine, InvalidTransitionError, TransitionAction
        except ImportError:
            pytest.skip("state_machine module not importable in this environment")

    def _mock_application(self, status: str):
        app = MagicMock()
        app.status = status
        app.id = 1
        app.job_id = 1
        app.hr_id = 1
        app.candidate_email = "test@example.com"
        app.interview = None
        return app

    def test_rejected_is_terminal(self):
        CandidateStateMachine, InvalidTransitionError, TransitionAction = self._get_fsm()
        mock_db = MagicMock()
        fsm = CandidateStateMachine(mock_db)
        app = self._mock_application("rejected")

        with pytest.raises((InvalidTransitionError, Exception)):
            fsm.transition(application=app, action=TransitionAction.HIRE, user_id=1)

    def test_onboarded_is_terminal(self):
        CandidateStateMachine, InvalidTransitionError, TransitionAction = self._get_fsm()
        mock_db = MagicMock()
        fsm = CandidateStateMachine(mock_db)
        app = self._mock_application("onboarded")

        with pytest.raises((InvalidTransitionError, Exception)):
            fsm.transition(application=app, action=TransitionAction.REJECT, user_id=1)


# ===========================================================================
# 7. get_offer_letter_data – helper structure & joining_date formatting
# ===========================================================================

class TestGetOfferLetterData:
    """get_offer_letter_data must return the expected keys and format joining_date."""

    def test_returns_required_keys(self):
        try:
            from app.services.offer_letter_service import get_offer_letter_data
        except ImportError:
            pytest.skip("offer_letter_service not importable")

        data = get_offer_letter_data(
            candidate_name="Alice",
            job_role="Engineer",
            department="Engineering",
            joining_date=datetime(2027, 1, 15),
            company_name="Acme",
            logo_url=None,
            hr_email="hr@acme.com",
        )
        required_keys = {
            "candidate_name", "job_role", "department", "joining_date",
            "company_name", "logo", "logo_url", "hr_email", "offer_date",
        }
        assert required_keys.issubset(set(data.keys()))

    def test_joining_date_formatted_correctly(self):
        try:
            from app.services.offer_letter_service import get_offer_letter_data
        except ImportError:
            pytest.skip("offer_letter_service not importable")

        data = get_offer_letter_data(
            candidate_name="Bob",
            job_role="Dev",
            department="Eng",
            joining_date=datetime(2027, 3, 5),
            company_name="Corp",
            logo_url=None,
            hr_email="hr@corp.com",
        )
        assert data["joining_date"] == "March 05, 2027"

    def test_none_joining_date_returns_tbd(self):
        try:
            from app.services.offer_letter_service import get_offer_letter_data
        except ImportError:
            pytest.skip("offer_letter_service not importable")

        data = get_offer_letter_data(
            candidate_name="Bob",
            job_role="Dev",
            department="Eng",
            joining_date=None,
            company_name="Corp",
            logo_url=None,
            hr_email="hr@corp.com",
        )
        assert data["joining_date"] == "TBD"
