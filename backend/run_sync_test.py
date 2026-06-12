from app.infrastructure.database import SessionLocal
from app.domain.models import AttachmentResume, GlobalSettings
from app.services.email_ingestion_service import fetch_resume_attachments
import logging

# Set logging to debug to see all details
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger()

print("Deleting existing AttachmentResume records...")
with SessionLocal() as db:
    db.query(AttachmentResume).delete()
    # Also delete global sync checkpoint to force fetching all emails
    db.query(GlobalSettings).filter(GlobalSettings.key == "last_email_sync_at").delete()
    db.commit()

print("Running email sync...")
with SessionLocal() as db:
    # Use the credentials
    res = fetch_resume_attachments(
        db=db,
        imap_user="caldiminternship@gmail.com",
        imap_pass="wrbx qzvb bxgd jxgy",
        hr_id=1
    )
    print(f"Sync result: {res}")

print("Checking AttachmentResume records in DB...")
with SessionLocal() as db:
    items = db.query(AttachmentResume).all()
    print(f"Total items in DB: {len(items)}")
    for item in items:
        print(f"ID: {item.id}")
        print(f"Sender: {item.sender_email}")
        print(f"Subject: {item.subject}")
        print(f"File Name: {item.file_name}")
        print(f"File URL: {item.file_url}")
        print(f"Processed: {item.processed}")
        print(f"Mapping Failed: {item.mapping_failed}")
        print(f"Last Error: {item.last_error}")
