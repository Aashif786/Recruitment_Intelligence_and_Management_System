
import sqlite3
from datetime import datetime, timedelta, timezone

# Connect to the database
conn = sqlite3.connect('c:/Users/user/Desktop/RIMS/rims/backend/rims.db')
cursor = conn.cursor()

# Get the current date in the same way the frontend does (at midnight)
# Note: The frontend uses local browser time. The system time is 2026-05-14.
today = datetime(2026, 5, 14)
seven_days_later = today + timedelta(days=7)

print(f"Checking joinings between {today.date()} and {seven_days_later.date()} (inclusive)")

# Query candidates with joining dates
# Statuses: ["hired", "pending_approval", "offer_sent", "accepted", "onboarded"]
# Exclusion: status = 'onboarded'
cursor.execute("""
    SELECT id, candidate_name, joining_date, status 
    FROM applications 
    WHERE status IN ('hired', 'pending_approval', 'offer_sent', 'accepted')
    AND joining_date IS NOT NULL
""")

rows = cursor.fetchall()

upcoming_count = 0
print("\nCandidates with joining dates (not onboarded):")
for row in rows:
    app_id, name, joining_date_str, status = row
    try:
        # The joining_date in DB might be ISO format
        if 'T' in joining_date_str:
            j_date = datetime.fromisoformat(joining_date_str.replace('Z', '+00:00')).replace(tzinfo=None)
        else:
            j_date = datetime.strptime(joining_date_str[:10], "%Y-%m-%d")
        
        j_date = j_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        diff = (j_date - today).days
        is_upcoming = 0 <= diff <= 7
        
        if is_upcoming:
            upcoming_count += 1
            print(f"ID: {app_id}, Name: {name}, Date: {joining_date_str}, Status: {status} -> UPCOMING")
        else:
            print(f"ID: {app_id}, Name: {name}, Date: {joining_date_str}, Status: {status} -> NOT UPCOMING (diff: {diff} days)")
    except Exception as e:
        print(f"ID: {app_id}, Name: {name}, Error parsing date '{joining_date_str}': {e}")

print(f"\nTotal Upcoming Joinings (7d): {upcoming_count}")

conn.close()
