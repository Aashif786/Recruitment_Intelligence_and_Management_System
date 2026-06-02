import os
import re

filepath = 'c:/Users/user/Desktop/PROJECT/rims/backend/app/services/email_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import html' not in content:
    content = content.replace('import smtplib', 'import smtplib\nimport html')

content = content.replace('mock email \'{to_email}\'', 'mock email \'{_safe_email_target(to_email)}\'')
content = content.replace('to: {to_email}', 'to: {_safe_email_target(to_email)}')
content = content.replace('for {to_email}', 'for {_safe_email_target(to_email)}')
content = content.replace('to={to_email}', 'to={_safe_email_target(to_email)}')
content = content.replace('Resend {to_email}:', 'Resend {_safe_email_target(to_email)}:')
content = content.replace('email to {to_email}', 'email to {_safe_email_target(to_email)}')

html_vars = [
    'otp',
    'job_title',
    'application.job.title',
    'application.candidate_email',
    'raw_access_key',
    'candidate_name',
    'company_name',
    'accept_link',
    'reject_link',
    'offer_letter_url',
    'access_url',
    'support_url',
    'reason',
    'hr_response',
    'issue_type',
    'new_key',
    'joining_date',
]

def escape_match(match):
    var = match.group(1)
    if any(var == v for v in html_vars) or var.endswith(')'):
        if 'html.escape' not in var:
            return f'{{html.escape(str({var}))}}'
    return match.group(0)

parts = content.split('body = f\"\"\"')
for i in range(1, len(parts)):
    subparts = parts[i].split('\"\"\"', 1)
    if len(subparts) == 2:
        body_content = subparts[0]
        body_content = re.sub(r'\{([^}]+)\}', escape_match, body_content)
        parts[i] = body_content + '\"\"\"' + subparts[1]

content = 'body = f\"\"\"'.join(parts)

parts = content.split('rows_html = "".join(')
if len(parts) > 1:
    subparts = parts[1].split('for c in candidates_list', 1)
    if len(subparts) == 2:
        row_content = subparts[0]
        row_content = row_content.replace("{c['name']}", "{html.escape(str(c['name']))}")
        row_content = row_content.replace("{c['job_title']}", "{html.escape(str(c['job_title']))}")
        row_content = row_content.replace("{c['joining_date']}", "{html.escape(str(c['joining_date']))}")
        parts[1] = row_content + 'for c in candidates_list' + subparts[1]
content = 'rows_html = "".join('.join(parts)

content = content.replace('body = f"<html><body><p>{message}</p></body></html>"', 'body = f"<html><body><p>{html.escape(str(message))}</p></body></html>"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
