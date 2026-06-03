import sys
import os
import time
import re
from email.header import Header
from email.message import EmailMessage

# Add backend root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the target decoding/parsing functions
from app.services.email_ingestion_service import (
    _decode_subject,
    _decode_filename,
    _decode_email_body,
    _extract_email
)

class MockPart:
    def __init__(self, payload, charset=None, content_type="text/plain", disposition=""):
        self.payload = payload
        self.charset = charset
        self.content_type = content_type
        self.disposition = disposition
        
    def is_multipart(self):
        return False
        
    def get_payload(self, decode=False):
        return self.payload
        
    def get_content_charset(self):
        return self.charset
        
    def get_content_type(self):
        return self.content_type
        
    def get(self, name, default=None):
        if name == "Content-Disposition":
            return self.disposition
        return default

class MockMultipartMessage:
    def __init__(self, parts):
        self.parts = parts
        
    def is_multipart(self):
        return True
        
    def walk(self):
        return self.parts
        
    def get_content_type(self):
        return "multipart/mixed"
        
    def get(self, name, default=None):
        return default

def run_tests():
    print("=" * 70)
    print("      RIMS EMAIL INGESTION SYSTEM - 10,000 TEST CASES SUITE")
    print("=" * 70)
    
    start_time = time.time()
    
    # Track statistics
    stats = {
        "subject_decode": {"total": 0, "passed": 0, "failed": 0},
        "email_extract": {"total": 0, "passed": 0, "failed": 0},
        "filename_decode": {"total": 0, "passed": 0, "failed": 0},
        "body_decode": {"total": 0, "passed": 0, "failed": 0}
    }

    # -------------------------------------------------------------------------
    # 1. Test 2,500 cases of _decode_subject
    # -------------------------------------------------------------------------
    print("Running 2,500 subject decoding tests...")
    
    # Scenario A: Plain text (800 cases)
    for i in range(800):
        subject = f"Application for JOB-100{i:03d} - Software Engineer"
        decoded = _decode_subject(subject)
        stats["subject_decode"]["total"] += 1
        if decoded == subject:
            stats["subject_decode"]["passed"] += 1
        else:
            stats["subject_decode"]["failed"] += 1

    # Scenario B: RFC 2047 Single Encoded (800 cases)
    for i in range(800):
        raw_header = f"=?utf-8?q?Application_for_JOB-200{i:03d}?="
        expected = f"Application for JOB-200{i:03d}"
        decoded = _decode_subject(raw_header)
        stats["subject_decode"]["total"] += 1
        if decoded == expected:
            stats["subject_decode"]["passed"] += 1
        else:
            stats["subject_decode"]["failed"] += 1

    # Scenario C: RFC 2047 Multipart/Split Encoded (900 cases)
    for i in range(900):
        raw_header = f"=?utf-8?q?JOB-300{i:03d}_?= =?utf-8?q?Candidate_Resume?="
        expected = f"JOB-300{i:03d} Candidate Resume"
        decoded = _decode_subject(raw_header)
        stats["subject_decode"]["total"] += 1
        if decoded == expected:
            stats["subject_decode"]["passed"] += 1
        else:
            stats["subject_decode"]["failed"] += 1

    # -------------------------------------------------------------------------
    # 2. Test 2,500 cases of _extract_email
    # -------------------------------------------------------------------------
    print("Running 2,500 email extraction tests...")
    
    # Scenario A: Standard angle bracket formats (600 cases)
    for i in range(600):
        sender = f"John Doe {i} <john.doe.{i}@example.com>"
        expected = f"john.doe.{i}@example.com"
        extracted = _extract_email(sender)
        stats["email_extract"]["total"] += 1
        if extracted == expected:
            stats["email_extract"]["passed"] += 1
        else:
            stats["email_extract"]["failed"] += 1

    # Scenario B: Direct email formats with spaces (600 cases)
    for i in range(600):
        sender = f"   candidate.{i}@gmail.com   "
        expected = f"candidate.{i}@gmail.com"
        extracted = _extract_email(sender)
        stats["email_extract"]["total"] += 1
        if extracted == expected:
            stats["email_extract"]["passed"] += 1
        else:
            stats["email_extract"]["failed"] += 1

    # Scenario C: Invalid/Malformed emails (600 cases)
    for i in range(600):
        sender = f"invalid-email-address-{i}"
        extracted = _extract_email(sender)
        stats["email_extract"]["total"] += 1
        if extracted is None:
            stats["email_extract"]["passed"] += 1
        else:
            stats["email_extract"]["failed"] += 1

    # Scenario D: Bytes-like and Header-like sender inputs (700 cases)
    for i in range(700):
        expected = f"test.sender.{i}@example.com"
        raw_str = f"Test Sender {i} <{expected}>"
        
        # Alternate between bytes and Header objects
        if i % 2 == 0:
            sender_input = raw_str.encode('utf-8')
        else:
            sender_input = Header(raw_str, 'utf-8')
            
        extracted = _extract_email(sender_input)
        stats["email_extract"]["total"] += 1
        if extracted == expected:
            stats["email_extract"]["passed"] += 1
        else:
            stats["email_extract"]["failed"] += 1
            if i < 2:
                print(f"  [DEBUG] Failed Sender Coercion: Input Type={type(sender_input)} Extracted={extracted}")

    # -------------------------------------------------------------------------
    # 3. Test 2,500 cases of _decode_filename
    # -------------------------------------------------------------------------
    print("Running 2,500 filename decoding tests...")
    
    # Scenario A: Plain filenames (1,250 cases)
    for i in range(1250):
        filename = f"resume_candidate_{i}.pdf"
        decoded = _decode_filename(filename)
        stats["filename_decode"]["total"] += 1
        if decoded == filename:
            stats["filename_decode"]["passed"] += 1
        else:
            stats["filename_decode"]["failed"] += 1

    # Scenario B: Encoded filenames (1,250 cases)
    for i in range(1250):
        raw_header = f"=?utf-8?q?resume=5Fcandidate=5F{i}=2Epdf?="
        expected = f"resume_candidate_{i}.pdf"
        decoded = _decode_filename(raw_header)
        stats["filename_decode"]["total"] += 1
        if decoded == expected:
            stats["filename_decode"]["passed"] += 1
        else:
            stats["filename_decode"]["failed"] += 1

    # -------------------------------------------------------------------------
    # 4. Test 2,500 cases of _decode_email_body
    # -------------------------------------------------------------------------
    print("Running 2,500 email body decoding tests...")
    
    # Scenario A: Plain text only (600 cases)
    for i in range(600):
        msg = EmailMessage()
        body_content = f"Hello, please find my application for the role. My phone number is +1-555-019-{i:03d}."
        msg.set_content(body_content)
        
        decoded = _decode_email_body(msg)
        stats["body_decode"]["total"] += 1
        if decoded.strip() == body_content.strip():
            stats["body_decode"]["passed"] += 1
        else:
            stats["body_decode"]["failed"] += 1

    # Scenario B: HTML only / Fallback tag cleaning (600 cases)
    for i in range(600):
        msg = EmailMessage()
        html_content = f"<html><body><p>Dear Hiring Manager,</p><p>My phone number is <b>+91 98765 43{i:03d}</b>.</p></body></html>"
        msg.add_alternative(html_content, subtype='html')
        
        decoded = _decode_email_body(msg)
        stats["body_decode"]["total"] += 1
        
        expected_substring = f"My phone number is +91 98765 43{i:03d}"
        if expected_substring in decoded:
            stats["body_decode"]["passed"] += 1
        else:
            stats["body_decode"]["failed"] += 1

    # Scenario C: String payloads inside parts of a multipart email (600 cases)
    for i in range(600):
        expected_text = f"String body content case {i}"
        part = MockPart(payload=expected_text, charset="utf-8", content_type="text/plain")
        msg = MockMultipartMessage([part])
        
        decoded = _decode_email_body(msg)
        stats["body_decode"]["total"] += 1
        if decoded.strip() == expected_text:
            stats["body_decode"]["passed"] += 1
        else:
            stats["body_decode"]["failed"] += 1
            if i == 0:
                print(f"  [DEBUG] Failed String Payload Body: Expected='{expected_text}' Decoded='{decoded}'")

    # Scenario D: Bytes payloads requiring fallback encodings (700 cases)
    encodings = ["utf-8", "latin-1", "cp1252"]
    for i in range(700):
        expected_text = f"Bytes body content case {i} with non-ASCII text: \xef\xbf\xbd"
        enc = encodings[i % len(encodings)]
        payload_bytes = expected_text.encode(enc, errors="replace")
        
        part = MockPart(payload=payload_bytes, charset=enc, content_type="text/plain")
        msg = MockMultipartMessage([part])
        
        decoded = _decode_email_body(msg)
        stats["body_decode"]["total"] += 1
        
        # Check that it decodes cleanly and contains the main string
        if "Bytes body content case" in decoded:
            stats["body_decode"]["passed"] += 1
        else:
            stats["body_decode"]["failed"] += 1

    # -------------------------------------------------------------------------
    # Summary Report
    # -------------------------------------------------------------------------
    total_time = time.time() - start_time
    total_cases = sum(s["total"] for s in stats.values())
    total_passed = sum(s["passed"] for s in stats.values())
    total_failed = sum(s["failed"] for s in stats.values())
    
    print("\n" + "=" * 70)
    print("                           TEST RESULTS SUMMARY")
    print("=" * 70)
    print(f"Total Test Cases Run : {total_cases:,}")
    print(f"Total Passed Cases   : {total_passed:,}")
    print(f"Total Failed Cases   : {total_failed:,}")
    print(f"Success Rate         : {(total_passed / total_cases) * 100:.2f}%")
    print(f"Time Taken           : {total_time:.2f} seconds")
    print(f"Throughput           : {total_cases / total_time:.1f} cases/sec")
    print("-" * 70)
    
    print(f"{'Category':<20} | {'Total':<10} | {'Passed':<10} | {'Failed':<10} | {'Success %':<10}")
    print("-" * 70)
    for cat, data in stats.items():
        pct = (data["passed"] / data["total"]) * 100
        print(f"{cat:<20} | {data['total']:<10,} | {data['passed']:<10,} | {data['failed']:<10,} | {pct:.2f}%")
    print("=" * 70)

    if total_failed > 0:
        print("[FAIL] Test suite failed with failures detected.")
        sys.exit(1)
    else:
        print("[SUCCESS] All 10,000 test cases passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_tests()
