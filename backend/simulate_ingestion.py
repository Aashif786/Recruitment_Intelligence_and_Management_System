import imaplib
import email
import re
import mimetypes
import time
import uuid

imap_user = "caldiminternship@gmail.com"
imap_pass = "wrbx qzvb bxgd jxgy"
imap_server = "imap.gmail.com"

mail = imaplib.IMAP4_SSL(imap_server, timeout=30)
mail.login(imap_user, imap_pass)
mail.select("INBOX")

status, response = mail.search(None, '(FROM "pradeepmuthuselvan08@gmail.com")')
email_ids = response[0].split()

if email_ids:
    email_id = email_ids[-1]
    res, msg = mail.fetch(email_id, "(RFC822)")
    if res == "OK":
        for response_part in msg:
            if isinstance(response_part, tuple):
                msg_obj = email.message_from_bytes(response_part[1])
                print(f"Is Multipart: {msg_obj.is_multipart()}")
                
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
                        
                        print(f"\nChecking part Content-Type={content_type}, Content-Disposition={content_disposition}")
                        print(f"Initial is_attachment evaluation: {is_attachment}")
                        
                        if not is_attachment:
                            ct_name = part.get_param("name")
                            if ct_name:
                                print(f"Checking ct_name: {ct_name}")
                                if ct_name.lower().endswith((".pdf", ".doc", ".docx")):
                                    is_attachment = True
                                    print("is_attachment set to True via ct_name parameter.")
                        
                        if not is_attachment:
                            print("Skipped: not considered an attachment.")
                            continue
                            
                        filename = part.get_filename()
                        if not filename:
                            filename = part.get_param('name')
                        print(f"Extracted filename: {filename}")
                        
                        is_resume = filename.lower().endswith((".pdf", ".doc", ".docx")) if filename else False
                        print(f"Is resume extension? {is_resume}")
                        if not is_resume:
                            print("Skipped: not a resume extension.")
                            continue
                            
                        file_data = part.get_payload(decode=True)
                        print(f"Payload len: {len(file_data) if file_data else 0} bytes")
                        if not file_data or len(file_data) == 0:
                            print("Skipped: empty payload.")
                            continue
                            
                        ext_lower = filename.lower()
                        magic_valid = True
                        if ext_lower.endswith(".pdf") and not file_data.startswith(b"%PDF"):
                            print("Rejecting: invalid PDF magic bytes.")
                            magic_valid = False
                        elif ext_lower.endswith(".docx") and not file_data.startswith(b"PK\x03\x04"):
                            print(f"Rejecting: invalid DOCX magic bytes. Starts with: {file_data[:20]}")
                            magic_valid = False
                        elif ext_lower.endswith(".doc") and not file_data.startswith(b"\xd0\xcf\x11\xe0"):
                            print("Rejecting: invalid DOC magic bytes.")
                            magic_valid = False
                            
                        print(f"Magic valid: {magic_valid}")
                        if magic_valid:
                            resume_count += 1
                
                print(f"\nSimulation complete. Resumes identified: {resume_count}")
else:
    print("No emails found.")

mail.close()
mail.logout()
