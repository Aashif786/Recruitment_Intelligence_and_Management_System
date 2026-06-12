import asyncio
import logging
import sys

# Configure logging to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

from app.infrastructure.database import SessionLocal
from app.services.email_ingestion_service import fetch_resume_attachments, run_batch_resume_processing
from app.domain.models import AttachmentResume

async def main():
    print("Running sync_now.py...")
    with SessionLocal() as db:
        print("Fetching resume attachments...")
        result = fetch_resume_attachments(
            db=db,
            imap_user="caldiminternship@gmail.com",
            imap_pass="wrbx qzvb bxgd jxgy",
            hr_id=1
        )
        print(f"Fetch result: {result}")
        
        print("Running batch resume processing...")
        proc_result = await run_batch_resume_processing(db, hr_id=1)
        print(f"Processing result: {proc_result}")

if __name__ == "__main__":
    asyncio.run(main())
