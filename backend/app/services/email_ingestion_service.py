import imaplib
import email
import socket
import time
import uuid
import mimetypes
import hashlib
from email.header import decode_header
from email.utils import parsedate_to_datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
from app.domain.models import AttachmentResume, Application, Job
from app.core.config import get_settings
import logging
import re
import requests

logger = logging.getLogger(__name__)

def _retry_with_backoff(func, max_attempts=3, delays=[2, 4, 8]):
    """Retry function with exponential backoff"""
    for attempt in range(max_attempts):
        try:
            return func()
        except (ConnectionRefusedError, socket.timeout) as e:
            if attempt < max_attempts - 1:
                delay = delays[attempt] if attempt < len(delays) else delays[-1]
                logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                raise
    return None

def _decode_subject(subject_header):
    """Safely decode email subject with fallback encodings"""
    if not subject_header:
        return ""
    
    try:
        decoded_parts = decode_header(subject_header)
        subject, encoding = decoded_parts[0]
        
        if subject is None:
            return ""
        
        if isinstance(subject, bytes):
            # Try specified encoding first
            if encoding:
                try:
                    return subject.decode(encoding)
                except (UnicodeDecodeError, LookupError):
                    pass
            
            # Fallback encodings
            for enc in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    return subject.decode(enc, errors='replace')
                except (UnicodeDecodeError, LookupError):
                    continue
            
            # Last resort
            return subject.decode('utf-8', errors='replace')
        
        return str(subject)
    except Exception as e:
        logger.warning(f"Failed to decode subject: {e}")
        return ""

def _extract_email(sender_str):
    """Extract and validate email address from sender string"""
    if not sender_str:
        return None
    
    # Try angle bracket format first
    match = re.search(r'<([^>]+)>', sender_str)
    if match:
        email_addr = match.group(1).strip().lower()
    else:
        # Try direct email format
        email_addr = sender_str.strip().lower()
    
    # Validate email format
    if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email_addr):
        return email_addr
    
    return None

def _decode_email_body(msg_obj):
    """Decode email body with charset detection and fallback"""
    email_body = ""
    
    try:
        if msg_obj.is_multipart():
            for part in msg_obj.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))
                
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            # Try to get charset
                            charset = part.get_content_charset() or 'utf-8'
                            try:
                                email_body += payload.decode(charset, errors='replace')
                            except (UnicodeDecodeError, LookupError):
                                # Fallback encodings
                                for enc in ['utf-8', 'latin-1', 'cp1252']:
                                    try:
                                        email_body += payload.decode(enc, errors='replace')
                                        break
                                    except (UnicodeDecodeError, LookupError):
                                        continue
                    except Exception as e:
                        logger.warning(f"Failed to decode email body part: {e}")
                        continue
        else:
            try:
                payload = msg_obj.get_payload(decode=True)
                if payload:
                    charset = msg_obj.get_content_charset() or 'utf-8'
                    try:
                        email_body = payload.decode(charset, errors='replace')
                    except (UnicodeDecodeError, LookupError):
                        for enc in ['utf-8', 'latin-1', 'cp1252']:
                            try:
                                email_body = payload.decode(enc, errors='replace')
                                break
                            except (UnicodeDecodeError, LookupError):
                                continue
            except Exception as e:
                logger.warning(f"Failed to decode email body: {e}")
    except Exception as e:
        logger.error(f"Error decoding email body: {e}")
    
    return email_body if email_body else "[Email body could not be decoded]"

def _decode_filename(filename_header):
    """Safely decode attachment filename"""
    if not filename_header:
        return None
    
    try:
        decoded_parts = decode_header(filename_header)
        filename, encoding = decoded_parts[0]
        
        if isinstance(filename, bytes):
            if encoding:
                try:
                    return filename.decode(encoding)
                except (UnicodeDecodeError, LookupError):
                    pass
            
            for enc in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    return filename.decode(enc, errors='replace')
                except (UnicodeDecodeError, LookupError):
                    continue
        
        return str(filename) if filename else None
    except Exception as e:
        logger.warning(f"Failed to decode filename: {e}")
        return None

def _generate_synthetic_message_id(sender, subject, received_at):
    """Generate synthetic message ID for emails without Message-ID header"""
    content = f"{sender}{subject}{received_at}".encode('utf-8')
    return hashlib.sha256(content).hexdigest()

def fetch_resume_attachments(db: Session, imap_user: str, imap_pass: str):
    """
    Connect to IMAP, fetch emails, extract attachments (PDFs/Docx), 
    and store them into the AttachmentResume table with comprehensive error handling.
    """
    if not imap_user or not imap_pass:
        logger.error("IMAP credentials not provided.")
        return {"success": False, "error": "IMAP credentials missing."}

    imap_server = "imap.gmail.com"
    
    def connect_imap():
        mail = imaplib.IMAP4_SSL(imap_server, timeout=30)
        mail.login(imap_user, imap_pass)
        return mail
    
    try:
        # Connect with retry logic
        mail = _retry_with_backoff(connect_imap)
        if not mail:
            return {"success": False, "error": "Failed to connect after retries"}
        
        # Select mailbox
        status, response = mail.select("INBOX")
        if status != "OK":
            logger.error(f"Failed to select INBOX. Status: {status}, Response: {response}")
            return {"success": False, "error": f"Could not access inbox. Status: {status}"}
        
        # Search for emails
        status, messages = mail.search(None, 'ALL')
        if status != "OK":
            return {"success": False, "error": "Could not search inbox."}

        email_ids = messages[0].split()
        
        # Process 10 most recent emails
        if len(email_ids) > 10:
            email_ids = email_ids[-10:]
            
        saved_count = 0
        logger.info(f"Scanning {len(email_ids)} emails for resume attachments...")
        
        for email_id in reversed(email_ids):
            try:
                # Fetch metadata
                res, msg_meta = mail.fetch(email_id, "(BODY[HEADER.FIELDS (SUBJECT FROM DATE MESSAGE-ID)])")
                if res != "OK":
                    logger.warning(f"Failed to fetch metadata for email ID {email_id.decode()}")
                    continue
                
                header_obj = email.message_from_bytes(msg_meta[0][1])
                
                # Extract and decode subject
                subject = _decode_subject(header_obj.get("Subject"))
                
                # Extract sender email
                sender = header_obj.get("From", "")
                raw_email = _extract_email(sender)
                if not raw_email:
                    logger.warning(f"Could not extract valid email from: {sender}")
                    continue
                
                # Parse date with fallback
                date_str = header_obj.get("Date")
                received_at = datetime.utcnow()
                if date_str:
                    try:
                        received_at = parsedate_to_datetime(date_str)
                    except Exception as e:
                        logger.warning(f"Failed to parse date '{date_str}': {e}. Using current time.")
                
                # Get or generate message ID
                msg_id = (header_obj.get("Message-ID") or "").strip()
                if not msg_id:
                    msg_id = _generate_synthetic_message_id(sender, subject, received_at)
                    logger.info(f"Generated synthetic message ID for email from {raw_email}")
                
                # Duplicate check - Message-ID first
                existing = db.query(AttachmentResume).filter(
                    AttachmentResume.message_id == msg_id
                ).first()
                
                if existing:
                    logger.info(f"Skipping duplicate email (Message-ID): {subject} from {raw_email}")
                    continue
                
                # Secondary duplicate check - composite key
                if not existing and subject and raw_email:
                    existing = db.query(AttachmentResume).filter(
                        AttachmentResume.subject == subject,
                        AttachmentResume.sender_email.ilike(f"%{raw_email}%"),
                        func.date(AttachmentResume.received_at) == received_at.date()
                    ).first()
                    
                    if existing:
                        logger.info(f"Skipping duplicate email (composite key): {subject} from {raw_email}")
                        continue
                
                # Fetch full email
                res, msg = mail.fetch(email_id, "(RFC822)")
                if res != "OK":
                    logger.warning(f"Failed to fetch full content for email ID {email_id.decode()}")
                    continue
                
                for response_part in msg:
                    if isinstance(response_part, tuple):
                        msg_obj = email.message_from_bytes(response_part[1])
                        
                        # Decode email body
                        email_body = _decode_email_body(msg_obj)
                        
                        # Process attachments
                        resume_count = 0
                        if msg_obj.is_multipart():
                            for part in msg_obj.walk():
                                if resume_count > 0:
                                    logger.warning(f"Email from {raw_email} has multiple resume attachments. Processing only the first one.")
                                    break
                                
                                content_type = part.get_content_type()
                                content_disposition = str(part.get("Content-Disposition", ""))
                                
                                if content_disposition and ("attachment" in content_disposition or "inline" in content_disposition):
                                    # Extract filename
                                    filename = part.get_filename()
                                    if not filename:
                                        # Try Content-Type name parameter
                                        filename = part.get_param('name')
                                    
                                    if filename:
                                        filename = _decode_filename(filename)
                                        
                                        if not filename:
                                            # Generate fallback filename
                                            ext = mimetypes.guess_extension(content_type) or '.bin'
                                            filename = f"resume_{int(time.time())}{ext}"
                                            logger.warning(f"Generated fallback filename: {filename}")
                                        
                                        # Check if it's a resume
                                        is_resume = filename.lower().endswith((".pdf", ".doc", ".docx"))
                                        if not is_resume:
                                            continue
                                        
                                        # Get file data
                                        file_data = part.get_payload(decode=True)
                                        if not file_data or len(file_data) == 0:
                                            logger.warning(f"Empty attachment data for {filename} from {raw_email}")
                                            continue
                                        
                                        # Check file size (10MB limit)
                                        if len(file_data) > 10 * 1024 * 1024:
                                            logger.warning(f"Attachment {filename} exceeds 10MB limit ({len(file_data)} bytes)")
                                            continue
                                        
                                        # Infer MIME type if missing
                                        if not content_type or content_type == 'application/octet-stream':
                                            content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
                                        
                                        # Upload to storage with retry
                                        from app.core.storage import upload_file, get_public_url
                                        
                                        safe_sender = raw_email.split("@")[0].replace(".", "_")
                                        safe_filename = re.sub(r'[^\w\.-]', '_', filename)
                                        # Add random suffix to prevent collisions
                                        random_suffix = str(uuid.uuid4())[:6]
                                        storage_path = f"ingested/{safe_sender}_{int(time.time())}_{random_suffix}_{safe_filename}"
                                        
                                        # Try upload with retry
                                        upload_res = upload_file('MAIL_ATTACHMENTS', storage_path, file_data, content_type)
                                        if not upload_res:
                                            logger.warning(f"First upload attempt failed. Retrying...")
                                            time.sleep(2)
                                            upload_res = upload_file('MAIL_ATTACHMENTS', storage_path, file_data, content_type)
                                        
                                        if not upload_res:
                                            logger.error(f"Failed to upload {filename} after retry. Skipping.")
                                            continue
                                        
                                        # Get public URL with retry
                                        file_url = get_public_url('MAIL_ATTACHMENTS', storage_path)
                                        if not file_url:
                                            logger.warning(f"First get_public_url attempt failed. Retrying...")
                                            time.sleep(2)
                                            file_url = get_public_url('MAIL_ATTACHMENTS', storage_path)
                                        
                                        if not file_url:
                                            logger.error(f"Failed to get public URL for {filename}. Skipping.")
                                            # TODO: Delete uploaded file
                                            continue
                                        
                                        # Create database record
                                        # SECURITY: Store sanitized filename to prevent path traversal
                                        # in filenames like ../../etc/passwd.pdf being persisted to DB.
                                        new_resume = AttachmentResume(
                                            message_id=msg_id,
                                            sender_email=sender,
                                            subject=subject,
                                            file_name=safe_filename,
                                            file_url=file_url,
                                            file_data=None,
                                            email_body=email_body,
                                            mime_type=content_type,
                                            received_at=received_at,
                                            retry_count=0,
                                            last_error=None
                                        )
                                        db.add(new_resume)
                                        saved_count += 1
                                        resume_count += 1
                                        logger.info(f"Ingested new resume from {raw_email}: {safe_filename}")
                        
                        if resume_count == 0:
                            logger.info(f"Email from {raw_email} had no resume attachments.")
                
                # Commit after each email
                db.commit()

            except Exception as e:
                logger.error(f"Error processing email {email_id.decode() if isinstance(email_id, bytes) else email_id}: {e}", exc_info=True)
                db.rollback()

        mail.close()
        mail.logout()
        return {"success": True, "count": saved_count}
        
    except socket.timeout:
        logger.error("IMAP connection timed out")
        return {"success": False, "error": "Connection timed out. Please check your network and try again."}
    except imaplib.IMAP4.error as e:
        error_str = str(e).lower()
        logger.error(f"IMAP authentication or protocol error: {e}")
        if "authentication" in error_str or "login" in error_str or "invalid credentials" in error_str or b"AUTHENTICATIONFAILED" in str(e).encode():
            return {"success": False, "error": "Authentication failed. Please verify your email and App Password."}
        return {"success": False, "error": "Mailbox connection failed. Please verify your IMAP settings and that IMAP access is enabled in Gmail."}
    except ConnectionRefusedError:
        logger.error("IMAP connection refused")
        return {"success": False, "error": "Could not reach the Gmail IMAP server. Please check your network connection and try again."}
    except Exception as e:
        logger.error(f"IMAP Error: {e}", exc_info=True)
        return {"success": False, "error": "Mailbox sync failed. Please verify your IMAP credentials and try again."}


async def run_batch_resume_processing(db: Session):
    """
    Finds all unprocessed resumes from the email ingestion database,
    automatically creates target Job Applications for them, and triggers the AI analysis pipeline.
    Uses row-level locking to prevent concurrent processing issues.
    """
    # Use SELECT FOR UPDATE SKIP LOCKED to prevent concurrent processing
    unprocessed = db.query(AttachmentResume).filter(
        AttachmentResume.processed == False
    ).with_for_update(skip_locked=True).order_by(AttachmentResume.id.asc()).limit(30).all()
    
    if not unprocessed:
        return {"message": "No new resumes to process.", "count": 0}
        
    open_jobs = db.query(Job).filter(Job.status == 'open').all()
    if not open_jobs:
        logger.warning("No open jobs available to assign incoming emailed resumes to.")
        # Mark as unprocessed so they can be retried when jobs are available
        return {"message": "No open jobs to map resumes.", "count": 0}
        
    processed_count = 0
    
    for resume in unprocessed:
        try:
            if not resume.file_url:
                resume.processed = True
                db.commit()
                continue
            
            # Map to target Job
            target_job = None
            subject_str = resume.subject or ""
            body_str = resume.email_body or ""
            combined_text_raw = f"{subject_str} {body_str}"
            combined_text_lower = combined_text_raw.lower()
            
            # Pattern A: Match Job Code (case-insensitive)
            job_codes = re.findall(r'JOB-[A-Z0-9]{6}', combined_text_raw, re.IGNORECASE)
            if job_codes:
                for code in job_codes:
                    extracted_code = code.upper().strip()
                    target_job = db.query(Job).filter(
                        func.upper(Job.job_id) == extracted_code,
                        Job.status == 'open'
                    ).first()
                    if target_job:
                        logger.info(f"Mapped resume {resume.id} to Job Code {extracted_code}")
                        if len(job_codes) > 1:
                            logger.info(f"Alternative job codes found: {[c for c in job_codes if c.upper() != extracted_code]}")
                        break
            
            # Pattern B: Match numeric Job ID with word boundaries
            if not target_job:
                numeric_id_match = re.search(r'\bjob\s*(?:id|code)?\s*[:\-\#]?\s*(\d+)\b', combined_text_lower)
                if numeric_id_match:
                    extracted_id = int(numeric_id_match.group(1).strip())
                    target_job = db.query(Job).filter(Job.id == extracted_id, Job.status == 'open').first()
                    if target_job:
                        logger.info(f"Mapped resume {resume.id} to Job ID {extracted_id}")
            
            # Pattern C: Job title matching with 80% threshold
            if not target_job:
                for job in open_jobs:
                    job_title_words = set(job.title.lower().split())
                    email_words = set(combined_text_lower.split())
                    
                    if len(job_title_words) > 0:
                        match_count = len(job_title_words & email_words)
                        match_percentage = match_count / len(job_title_words)
                        
                        if match_percentage >= 0.8:
                            target_job = job
                            logger.info(f"Mapped resume {resume.id} to Job Title '{job.title}' ({match_percentage:.0%} match)")
                            break

            if not target_job:
                logger.warning(f"Could not map resume {resume.id} from {resume.sender_email} to any open job.")
                resume.processed = True
                db.commit()
                continue

            # Re-query job status to ensure it's still open
            target_job = db.query(Job).filter(Job.id == target_job.id).first()
            if not target_job or target_job.status != 'open':
                logger.warning(f"Job {target_job.id if target_job else 'N/A'} is no longer open. Skipping.")
                resume.processed = True
                db.commit()
                continue

            # Extract candidate info
            sender_raw = resume.sender_email
            match = re.search(r'([^<]+)<', sender_raw)
            if match:
                candidate_name = match.group(1).strip()
            else:
                # Fallback to email local part
                email_match = re.search(r'([^@]+)@', sender_raw)
                candidate_name = email_match.group(1).replace('.', ' ').title() if email_match else "Candidate"
            
            match_email = re.search(r'<([^>]+)>', sender_raw)
            candidate_email = match_email.group(1).lower().strip() if match_email else sender_raw.lower().strip()
            
            # Validate email
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', candidate_email):
                logger.error(f"Invalid email format: {candidate_email}. Skipping.")
                resume.processed = True
                resume.last_error = f"Invalid email format: {candidate_email}"
                db.commit()
                continue
            
            # Get resume file path
            resume_file_path = None
            if resume.file_url and "/MAIL_ATTACHMENTS/" in resume.file_url:
                bucket_path = resume.file_url.split("/MAIL_ATTACHMENTS/")[-1].split("?")[0]
                resume_file_path = f"MAIL_ATTACHMENTS/{bucket_path}"
            
            if not resume_file_path:
                logger.error(f"Resume file path could not be determined for resume {resume.id}")
                resume.processed = True
                resume.last_error = "Resume file path could not be determined"
                db.commit()
                continue
            
            # SSRF Protection: validate resume.file_url before fetching (P2-H05)
            from urllib.parse import urlparse
            try:
                parsed_url = urlparse(resume.file_url)
                if not parsed_url.scheme or parsed_url.scheme.lower() != "https":
                    raise ValueError("Only HTTPS scheme is allowed for safety.")
                
                # Check netloc/domain
                allowed_domains = []
                if settings.supabase_url:
                    supabase_netloc = urlparse(settings.supabase_url).netloc
                    if supabase_netloc:
                        allowed_domains.append(supabase_netloc)
                
                netloc_lower = parsed_url.netloc.lower()
                is_allowed = netloc_lower.endswith(".supabase.co") or netloc_lower == "supabase.co" or any(d == netloc_lower for d in allowed_domains)
                
                if not is_allowed:
                    raise ValueError(f"Domain '{netloc_lower}' is not in the list of allowed Supabase storage domains.")
            except Exception as ssrf_err:
                logger.error(f"SSRF Prevention: Blocked fetching URL '{resume.file_url}': {ssrf_err}")
                resume.processed = True
                resume.last_error = f"SSRF Prevention: Blocked fetching URL: {ssrf_err}"
                db.commit()
                continue

            # Download file and calculate hash
            content = b""
            try:
                response = requests.get(resume.file_url, timeout=30)
                if response.status_code == 200:
                    content = response.content
                else:
                    logger.error(f"Failed to download resume: HTTP {response.status_code}")
                    resume.processed = False
                    resume.retry_count += 1
                    resume.last_error = f"Download failed: HTTP {response.status_code}"
                    db.commit()
                    continue
            except Exception as e:
                logger.error(f"Failed to download resume file from URL: {e}")
                resume.processed = False
                resume.retry_count += 1
                resume.last_error = str(e)
                db.commit()
                continue
            
            # Calculate hash
            if len(content) == 0:
                resume_hash = f"no_hash_{resume.id}_{int(time.time())}"
                logger.warning(f"Empty content for resume {resume.id}. Using synthetic hash.")
            else:
                resume_hash = hashlib.sha256(content).hexdigest()
            
            # Duplicate check with job_id
            existing_res = db.query(Application).filter(
                Application.job_id == target_job.id,
                Application.resume_hash == resume_hash
            ).first()
            
            if existing_res:
                logger.info(f"Resume with hash {resume_hash} already applied to job {target_job.id}. Skipping.")
                resume.processed = True
                db.commit()
                continue

            # Create application
            new_app = Application(
                job_id=target_job.id,
                hr_id=target_job.hr_id,
                candidate_name=candidate_name,
                candidate_email=candidate_email,
                resume_file_name=resume.file_name,
                resume_file_path=resume_file_path,
                resume_hash=resume_hash,
                status='applied',
                hr_notes="Ingested automatically from Email Recruiter Channel.",
                applied_at=datetime.utcnow(),
                resume_status='pending'
            )
            db.add(new_app)
            db.flush()
            
            # Trigger AI analysis
            try:
                from app.api.applications import process_application_background
                await process_application_background(
                    new_app.id,
                    target_job.id,
                    new_app.resume_file_path,
                    candidate_email,
                    candidate_name
                )
            except Exception as e:
                logger.error(f"Background processing failed for resume {resume.id}: {e}")
                resume.processed = False
                resume.retry_count += 1
                resume.last_error = str(e)
                db.commit()
                continue
            
            resume.processed = True
            db.commit()
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error mapping resume {resume.id}: {e}", exc_info=True)
            db.rollback()
            
    return {"message": f"Successfully processed {processed_count} resumes.", "count": processed_count}
