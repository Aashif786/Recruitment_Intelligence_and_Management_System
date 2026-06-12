from app.infrastructure.database import SessionLocal
from app.domain.models import AttachmentResume

with SessionLocal() as db:
    items = db.query(AttachmentResume).order_by(AttachmentResume.id.desc()).all()
    print(f"Total AttachmentResumes in database: {len(items)}")
    for item in items:
        print(f"\nID: {item.id}")
        print(f"Sender: {item.sender_email}")
        print(f"Subject: {item.subject}")
        print(f"File Name: {item.file_name}")
        print(f"File URL: {item.file_url[:100]}..." if item.file_url else "None")
        print(f"Received At: {item.received_at}")
        print(f"Processed: {item.processed}")
        print(f"Mapping Failed: {item.mapping_failed}")
        print(f"Last Error: {item.last_error}")
