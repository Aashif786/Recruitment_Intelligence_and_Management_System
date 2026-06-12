import imaplib
import email
from email.header import decode_header
from app.infrastructure.database import SessionLocal
from app.domain.models import AttachmentResume
from app.services.email_ingestion_service import _decode_subject, _extract_email

imap_user = "caldiminternship@gmail.com"
imap_pass = "wrbx qzvb bxgd jxgy"
imap_server = "imap.gmail.com"

mail = imaplib.IMAP4_SSL(imap_server, timeout=30)
mail.login(imap_user, imap_pass)
mail.select("INBOX")

status, response = mail.search(None, 'SINCE 12-Jun-2026')
email_ids = response[0].split()
print(f"Total emails since 12-Jun-2026: {len(email_ids)}")

with SessionLocal() as db:
    for eid in email_ids:
        res, msg = mail.fetch(eid, "(BODY[HEADER.FIELDS (SUBJECT FROM DATE MESSAGE-ID)])")
        if res == "OK" and msg and msg[0]:
            header_obj = email.message_from_bytes(msg[0][1])
            subject = _decode_subject(header_obj.get("Subject"))
            sender = header_obj.get("From", "")
            raw_email = _extract_email(sender)
            msg_id = (header_obj.get("Message-ID") or "").strip()
            
            print(f"\n--- Email ID {eid.decode()} ---")
            print(f"Subject: {subject}")
            print(f"Sender: {sender} (parsed: {raw_email})")
            print(f"Message-ID: {msg_id}")
            
            # Check duplicate in DB
            db_msg = db.query(AttachmentResume).filter(AttachmentResume.message_id == msg_id).first()
            print(f"Duplicate check by Message-ID: {db_msg.id if db_msg else 'No match'}")
            
            db_composite = db.query(AttachmentResume).filter(
                AttachmentResume.subject == subject,
                AttachmentResume.sender_email.ilike(f"%{raw_email}%")
            ).first()
            print(f"Duplicate check by subject & sender (ignoring date): {db_composite.id if db_composite else 'No match'}")
            
mail.close()
mail.logout()
