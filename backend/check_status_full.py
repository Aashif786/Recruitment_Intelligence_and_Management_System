from app.infrastructure.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    if "mysql" in str(engine.url):
        # MySQL check constraints
        result = conn.execute(text("SELECT CONSTRAINT_NAME, CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS WHERE CONSTRAINT_NAME LIKE 'check_applications_status'"))
        for row in result:
            print(f"Name: {row[0]}, Clause: {row[1]}")
    elif "sqlite" in str(engine.url):
        result = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='applications'"))
        for row in result:
            print(row[0])
