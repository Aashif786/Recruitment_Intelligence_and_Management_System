from app.infrastructure.database import SessionLocal
from app.domain.models import User
from app.core.encryption import decrypt_field

with SessionLocal() as db:
    users = db.query(User).all()
    for u in users:
        print(f"ID: {u.id}, Name: {u.full_name}, Email: {u.email}, Role: {u.role}")
        print(f"  IMAP Email: {u.imap_email}")
        print(f"  IMAP Password: {decrypt_field(u.imap_password) if u.imap_password else None}")
