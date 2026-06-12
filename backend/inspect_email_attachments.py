import imaplib
import email
from email.header import decode_header
import re

imap_user = "caldiminternship@gmail.com"
imap_pass = "wrbx qzvb bxgd jxgy"
imap_server = "imap.gmail.com"

print("Connecting to IMAP...")
mail = imaplib.IMAP4_SSL(imap_server, timeout=30)
mail.login(imap_user, imap_pass)
mail.select("INBOX")

print("Searching for email from Pradeep M...")
status, response = mail.search(None, '(FROM "pradeepmuthuselvan08@gmail.com" SUBJECT "Applying for JOB-KAYPB1:Software Developer")')
if status != "OK" or not response[0]:
    # Fallback to search all from Pradeep
    print("Not found with exact subject. Searching all from Pradeep...")
    status, response = mail.search(None, '(FROM "pradeepmuthuselvan08@gmail.com")')

email_ids = response[0].split()
print(f"Found {len(email_ids)} matching emails.")

if email_ids:
    # Get the latest one
    email_id = email_ids[-1]
    print(f"Fetching full content for email ID {email_id.decode()}...")
    res, msg = mail.fetch(email_id, "(RFC822)")
    if res == "OK":
        for response_part in msg:
            if isinstance(response_part, tuple):
                msg_obj = email.message_from_bytes(response_part[1])
                print(f"Subject: {msg_obj.get('Subject')}")
                print(f"From: {msg_obj.get('From')}")
                print(f"Date: {msg_obj.get('Date')}")
                print(f"Is Multipart: {msg_obj.is_multipart()}")
                
                part_idx = 0
                for part in msg_obj.walk():
                    part_idx += 1
                    content_type = part.get_content_type()
                    content_disposition = part.get("Content-Disposition")
                    filename = part.get_filename()
                    name_param = part.get_param("name")
                    print(f"\n--- Part {part_idx} ---")
                    print(f"  Content-Type: {content_type}")
                    print(f"  Content-Disposition: {content_disposition}")
                    print(f"  Filename (get_filename()): {filename}")
                    print(f"  Name param: {name_param}")
                    
                    payload = part.get_payload(decode=True)
                    if payload:
                        print(f"  Payload len: {len(payload)} bytes")
                        print(f"  Payload start (hex/bytes): {payload[:20]}")
                    else:
                        print("  Payload is None (or nested multipart)")
else:
    print("No emails found from Pradeep M.")

mail.close()
mail.logout()
