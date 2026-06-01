# RIMS Onboarding & Offer Pipeline Guide

This guide covers the complete post-hire journey — from issuing an offer letter to finalising a candidate's joining — as well as the email ingestion mailbox setup, photo capture, and ID card generation workflows.

---

## Table of Contents

1. [Offer Letter Pipeline](#1-offer-letter-pipeline)
2. [Managing Offer Letter Templates](#2-managing-offer-letter-templates)
3. [Email Resume Ingestion (IMAP Mailbox Sync)](#3-email-resume-ingestion-imap-mailbox-sync)
4. [Photo Capture & ID Card Generation](#4-photo-capture--id-card-generation)
5. [Reliability Monitoring](#5-reliability-monitoring)
6. [Audit Trail](#6-audit-trail)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Offer Letter Pipeline

The platform enforces a strict, auditable state machine so that offer documents are always consistent and legally sound.

### Full Workflow

| Step | Who Acts | What Happens |
| :---: | :--- | :--- |
| **1** | **HR** | Opens the candidate in the *Hired* stage and clicks **Request Offer**. A joining date must be selected. |
| **2** | **System** | Takes an immutable snapshot of the current global offer letter template. Future template edits will **not** affect this candidate's offer. |
| **3** | **System** | Sends an internal notification to all Super Admins requesting approval. |
| **4** | **Super Admin** | Reviews the offer in the **Approvals** dashboard and clicks **Approve** or **Reject**. |
| **5** | **System** | On approval, generates an immutable PDF contract via the Puppeteer rendering engine and stores it in Supabase. |
| **6** | **System** | Sends an automated email to the candidate's registered address containing the PDF and a secure, one-time accept/reject link. |
| **7** | **Candidate** | Opens the `/offer` portal, reads the document, and clicks **Accept** or **Decline**. Their IP address and timestamp are recorded for auditing. |
| **8** | **System** | Updates the candidate's status on the dashboard to **Offer Accepted** or **Offer Declined**. |
| **9** | **HR / System** | On the joining date, the system automatically transitions the candidate to **Onboarded**. HR can also click **Finalize Join** manually at any time. |

### State Transitions (simplified)

```
hired → offer_requested → offer_approved → offer_sent → accepted → onboarded
                       └──────────────────────────────→ declined
```

> **Important:** Invalid transitions (e.g. trying to approve an already-sent offer) are blocked by the state machine and show a clear error message — they will never silently corrupt data.

---

## 2. Managing Offer Letter Templates

### Where to Find It

**Dashboard → Settings → Offer Letter Template**

### Rules

- **Edit the template BEFORE clicking "Request Offer"** for any candidate. Once an offer is requested, that candidate's copy is frozen.
- The template is written in **HTML**. Basic inline styles are supported. Avoid external CSS links.
- The system ships with a ready-made **Professional Business Template** as the default.

### Available Placeholders

| Placeholder | Replaced With |
| :--- | :--- |
| `{{candidate_name}}` | Full name of the candidate |
| `{{job_role}}` | Job title the candidate applied for |
| `{{joining_date}}` | Selected joining date (formatted) |
| `{{company_name}}` | Company name from Global Settings |
| `{{salary}}` | Offered salary (if captured) |
| `{{hr_name}}` | Name of the HR who requested the offer |
| `{{offer_date}}` | Date the offer was issued |

### Editing Steps

1. Go to **Settings**.
2. Scroll to **Offer Letter Template**.
3. Edit the HTML body — use the placeholders above where needed.
4. Click **Save Settings**.
5. Verify the output by requesting a test offer on a dummy candidate before going live.

---

## 3. Email Resume Ingestion (IMAP Mailbox Sync)

HR teams can point RIMS at a Gmail mailbox (e.g. `careers@company.com`) and have all resume attachments automatically ingested and parsed.

### How to Set Up

1. Go to **Dashboard → Ingested Emails**.
2. Click **Configure Mailbox**.
3. Enter:
   - **IMAP Email** — the Gmail address (e.g. `careers@company.com`)
   - **App Password** — a 16-character Google App Password (not the normal Gmail password)
4. Toggle **Auto-Sync** on to run background syncs hourly.
5. Click **Save Configuration**.

### Generating a Gmail App Password

> This is required because Google blocks standard password login for third-party IMAP clients.

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security).
2. Enable **2-Step Verification** if not already on.
3. Search for **App Passwords**.
4. Select **Mail** and **Other (Custom name)** → name it `RIMS`.
5. Copy the 16-character password into the **App Password** field in RIMS.
6. Also ensure **IMAP access** is enabled in Gmail → Settings → See all settings → Forwarding and POP/IMAP.

### What Happens After Sync

- All PDF/DOCX attachments from unread emails are downloaded.
- Each attachment is stored in Supabase and recorded in the **Ingested Emails** table.
- AI parsing runs in the background to extract skills, experience, and contact details.
- You can manually assign any ingested resume to a job posting from the **Ingested Emails** page.

### Common Errors & Fixes

| Error Message | Cause | Fix |
| :--- | :--- | :--- |
| *Mailbox login failed. Please check your IMAP email address and App Password.* | Wrong credentials | Re-generate the App Password in Google Account settings |
| *Could not reach the Gmail IMAP server. Please check your network connection.* | Network / firewall issue | Check outbound port 993 is open |
| *The mailbox connection timed out.* | Slow network or Gmail outage | Retry in a few minutes |
| *Mailbox connection failed. Please verify your IMAP settings…* | IMAP disabled in Gmail | Enable IMAP in Gmail → Settings → Forwarding and POP/IMAP |

---

## 4. Photo Capture & ID Card Generation

Once a candidate is **Onboarded**, HR can capture their photo and generate a company ID card directly inside the platform.

### Photo Capture

1. Open the candidate in **Dashboard → Onboarding**.
2. Click **Capture Photo**.
3. Allow browser camera access when prompted.
4. Take the photo — it is uploaded automatically to Supabase and linked to the candidate's record.

> The photo must be captured **before** generating the ID card. If the ID card step fails, verify the photo was saved successfully first.

### ID Card Generation

1. With the photo saved, click **Generate ID Card**.
2. The system renders a PDF ID card containing:
   - Candidate photo
   - Full name
   - Job role / department
   - Employee ID (auto-assigned)
   - Company logo and name
3. The ID card is stored in Supabase and can be downloaded at any time from the candidate's onboarding page.

---

## 5. Reliability Monitoring

**Dashboard → Reliability Monitor** *(Super Admin only)*

The monitor tracks background AI resume-parsing jobs. If a parse job fails (e.g. due to a malformed PDF or a temporary AI provider outage), it appears here with a status of **Failed**.

### Actions

| Button | Effect |
| :--- | :--- |
| **Force Retry** | Re-queues the parse job immediately |
| **Dismiss** | Marks the failure as acknowledged without retrying |

All retries are logged in the Audit Trail.

---

## 6. Audit Trail

Every significant action is recorded immutably:

- Offer requests, approvals, rejections, and PDF generation events
- Candidate state transitions (with timestamps and actor user ID)
- Offer acceptance/rejection (with candidate IP address)
- Photo saves and ID card generation
- Login events and failed authentication attempts
- Settings changes

Audit logs can be exported from **Settings → Audit Log** (Super Admin only).

---

## 7. Troubleshooting

### Offer PDF Not Generated

- Check that the **Offer Letter Template** in Settings is valid HTML (no broken tags).
- Ensure the Puppeteer service is running (backend logs: `uvicorn` output).
- Re-try the offer approval from the Approvals page.

### Candidate Did Not Receive Offer Email

- Confirm SMTP credentials are correctly set in the backend `.env` (`SMTP_USER`, `SMTP_PASSWORD`).
- Check spam/junk folders.
- Use the **Resend Offer** button on the candidate's onboarding page.

### AI Parse Job Stuck

- Go to **Reliability Monitor** and click **Force Retry**.
- If the job fails again, open the candidate's application and re-upload the resume manually.

### State Machine Errors

Errors like *"This action is not allowed at the candidate's current stage"* mean the transition is blocked intentionally. Check the candidate's current status and follow the correct sequence described in [Section 1](#1-offer-letter-pipeline).

---

*Last updated: May 2026*
