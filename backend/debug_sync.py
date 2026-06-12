import imaplib
import email
import logging
import re
import mimetypes
import uuid
import time
import sys

# Configure logging to stdout
logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger("debug_sync")

from app.infrastructure.database import SessionLocal
from app.domain.models import AttachmentResume, Job
from app.services.email_ingestion_service import _decode_subject, _extract_email, _decode_email_body, _decode_filename, _is_job_related_email

imap_user = "caldiminternship@gmail.com"
imap_pass = "wrbx qzvb bxgd jxgy"
imap_server = "imap.gmail.com"

print("Connecting to IMAP...")
mail = imaplib.IMAP4_SSL(imap_server, timeout=30)
mail.login(imap_user, imap_pass)
mail.select("INBOX")

# Search for the latest email from Pradeep M
status, response = mail.search(None, '(FROM "pradeepmuthuselvan08@gmail.com")')
email_ids = response[0].split()
if not email_ids:
    print("No emails found.")
    sys.exit(0)

# Fetch latest email (10:41 AM)
email_id = email_ids[-1]
print(f"Fetching email ID: {email_id.decode()}")
res, msg = mail.fetch(email_id, "(RFC822)")
if res != "OK":
    print("Fetch failed.")
    sys.exit(0)

for response_part in msg:
    if isinstance(response_part, tuple):
        msg_obj = email.message_from_bytes(response_part[1])
        subject = _decode_subject(msg_obj.get("Subject"))
        sender = msg_obj.get("From", "")
        raw_email = _extract_email(sender)
        print(f"Sender: {sender}, Raw Email: {raw_email}, Subject: {subject}")
        
        email_body = _decode_email_body(msg_obj)
        email_body = email_body[:2000] if email_body else ""
        
        resume_count = 0
        if msg_obj.is_multipart():
            for part in msg_obj.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                is_attachment = bool(
                    content_disposition and (
                        "attachment" in content_disposition
                        or "inline" in content_disposition
                    )
                )
                
                if not is_attachment:
                    ct_name = part.get_param("name")
                    if ct_name:
                        ct_name_decoded = _decode_filename(ct_name) or ct_name
                        if ct_name_decoded.lower().endswith((".pdf", ".doc", ".docx")):
                            is_attachment = True
                
                if not is_attachment:
                    continue
                
                filename = part.get_filename()
                if not filename:
                    filename = part.get_param('name')
                
                if filename:
                    filename = _decode_filename(filename)
                
                if not filename:
                    ext = mimetypes.guess_extension(content_type) or '.bin'
                    filename = f"resume_{int(time.time())}{ext}"
                
                is_resume = filename.lower().endswith((".pdf", ".doc", ".docx"))
                if not is_resume:
                    continue
                
                file_data = part.get_payload(decode=True)
                print(f"File data length for {filename}: {len(file_data) if file_data else 0} bytes")
                if not file_data or len(file_data) == 0:
                    print(f"Skipping empty/None payload for {filename}")
                    continue
                
                if len(file_data) > 10 * 1024 * 1024:
                    print("Exceeds 10MB.")
                    continue
                
                ext_lower = filename.lower()
                magic_valid = True
                if ext_lower.endswith(".pdf") and not file_data.startswith(b"%PDF"):
                    print("Invalid PDF magic bytes")
                    magic_valid = False
                elif ext_lower.endswith(".docx") and not file_data.startswith(b"PK\x03\x04"):
                    print(f"Invalid DOCX magic bytes: {file_data[:10]}")
                    magic_valid = False
                elif ext_lower.endswith(".doc") and not file_data.startswith(b"\xd0\xcf\x11\xe0"):
                    print("Invalid DOC magic bytes")
                    magic_valid = False
                
                if not magic_valid:
                    continue
                
                from app.core.storage import upload_file, get_signed_url
                print("Calling upload_file...")
                upload_res = upload_file('MAIL_ATTACHMENTS', f"ingested/test_{filename}", file_data, content_type)
                print(f"Upload Result: {upload_res}")
                
                file_url = get_signed_url('MAIL_ATTACHMENTS', f"ingested/test_{filename}", expires_in=86400)
                print(f"Signed URL Result: {file_url}")
                if file_url:
                    resume_count += 1

print(f"Total resumes count: {resume_count}")
mail.close()
mail.logout()
