# RIMS — Client Production Setup Guide

> **RIMS (Recruit Intelligence Management System)** is a fully-automated, AI-powered recruitment platform. This guide covers everything a new client needs to get the system running in production — from Supabase provisioning to SSL, environment configuration, and zero-downtime deployments.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase — Database & Storage Setup](#2-supabase--database--storage-setup)
3. [Server Preparation](#3-server-preparation)
4. [Environment Configuration](#4-environment-configuration)
5. [SSL Certificate (HTTPS)](#5-ssl-certificate-https)
6. [First Deployment](#6-first-deployment)
7. [Automated CI/CD (GitHub Actions)](#7-automated-cicd-github-actions)
8. [Zero-Downtime Updates](#8-zero-downtime-updates)
9. [Security Hardening Checklist](#9-security-hardening-checklist)
10. [Post-Launch: First Login & Admin Setup](#10-post-launch-first-login--admin-setup)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

### Server Requirements

| Resource | Minimum | Recommended |
| :--- | :--- | :--- |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| Open ports | 22, 80, 443 | 22, 80, 443 |

### Software (install on the server)

```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # allow non-root docker usage (re-login after)

# Git
sudo apt install -y git

# Certbot (for free SSL)
sudo apt install -y certbot
```

### External Accounts Required

| Service | Purpose | Free Tier Available |
| :--- | :--- | :--- |
| [Supabase](https://supabase.com) | PostgreSQL database + file storage | ✅ Yes |
| [Groq](https://console.groq.com) | AI model provider (resume parsing, interviews) | ✅ Yes |
| Gmail / SMTP provider | Sending offer letters & notifications | ✅ Yes (Gmail) |
| GitHub | Code repository + CI/CD | ✅ Yes |

---

## 2. Supabase — Database & Storage Setup

### 2.1 Create a Supabase Project

1. Sign in at [supabase.com](https://supabase.com) and click **New Project**.
2. Choose a region close to your server.
3. Set a strong database password and save it — you will need it for the `DATABASE_URL`.

### 2.2 Run the Production Schema

1. In the Supabase dashboard, go to **SQL Editor**.
2. Open `setup/production_schema.sql` from this repository.
3. Paste the entire contents into the editor and click **Run**.
4. This creates all 20+ tables, indexes, and constraints.

> ✅ Verify: The **Table Editor** should show tables like `users`, `applications`, `jobs`, `audit_logs`, etc.

### 2.3 Create Storage Buckets

Go to **Storage** → **New bucket** and create all four of the following as **private** buckets:

| Bucket Name | Contents |
| :--- | :--- |
| `resumes` | Candidate PDF / DOCX CVs |
| `id-photos` | Candidate profile and onboarding photos |
| `id-cards` | Generated PDF employee ID cards |
| `offer-letters` | Generated offer letter PDFs |

> ⚠️ Bucket names are case-sensitive. Use exactly the names above.

### 2.4 Get Your Connection String

Go to **Project Settings → Database → Connection String → URI**.
Copy the URI — it looks like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```
This is your `DATABASE_URL`.

### 2.5 Get Your Supabase API Keys

Go to **Project Settings → API**:
- `SUPABASE_URL` — Project URL (e.g. `https://abcdef.supabase.co`)
- `SUPABASE_KEY` — **Service Role** secret key (not the anon key)

---

## 3. Server Preparation

SSH into your VPS and clone the repository:

```bash
ssh user@your-server-ip

# Clone into the standard web directory
sudo mkdir -p /var/www/rims
sudo chown $USER:$USER /var/www/rims
git clone https://github.com/caldimengg-manikandan/rims.git /var/www/rims
cd /var/www/rims
```

---

## 4. Environment Configuration

```bash
cd /var/www/rims/backend
cp .env.example .env
nano .env   # or use your preferred editor
```

Fill in every variable below — the application **will not start** with missing required values:

```env
# ── SECURITY ─────────────────────────────────────────────────────────────────
JWT_SECRET=<generate with: openssl rand -hex 32>
ENCRYPTION_KEY=<generate with: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">

# ── DATABASE ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# ── CORS (comma-separated, no trailing slash) ─────────────────────────────────
ALLOWED_ORIGINS=https://yourdomain.com

# ── FRONTEND URL (for email links & redirects) ───────────────────────────────
FRONTEND_BASE_URL=https://yourdomain.com/calrims

# ── AI SERVICES ───────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...

# ── EMAIL — SMTP (Gmail App Password recommended) ─────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=<16-character Google App Password>
SMTP_FROM=RIMS Recruitment <noreply@yourcompany.com>

# ── EMAIL — Resend (alternative to SMTP) ─────────────────────────────────────
RESEND_API_KEY=re_...          # leave blank if using SMTP above

# ── SUPABASE STORAGE ──────────────────────────────────────────────────────────
SUPABASE_URL=https://abcdef.supabase.co
SUPABASE_KEY=eyJ...            # Service Role key
```

### Generating Secret Keys

```bash
# JWT Secret
openssl rand -hex 32

# Fernet Encryption Key (required for IMAP password storage)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> ⚠️ **Back up your `.env` file securely.** If the `ENCRYPTION_KEY` is lost, stored IMAP passwords become permanently unreadable.

---

## 5. SSL Certificate (HTTPS)

The system requires HTTPS. Obtain a free certificate with Certbot:

```bash
# Stop any service on port 80 first (the server may not be running yet)
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

Update `nginx.conf` with your domain:

```bash
# Replace the placeholder domain
sed -i 's/caldimproducts.com/yourdomain.com/g' /var/www/rims/nginx.conf
```

Also update the Docker Compose URLs:

```bash
sed -i 's|https://caldimproducts.com/calrims|https://yourdomain.com/calrims|g' /var/www/rims/docker-compose.prod.yml
```

---

## 6. First Deployment

```bash
cd /var/www/rims

# Make deploy script executable
chmod +x deploy-zero-downtime.sh

# Build and start all services (blue environment)
docker compose -f docker-compose.prod.yml up -d --build

# Verify all containers are running and healthy
docker compose -f docker-compose.prod.yml ps
```

Expected output — all four containers should show `healthy`:

```
NAME                STATUS
rims-nginx-1        running
rims-frontend_blue  running (healthy)
rims-backend_blue   running (healthy)
```

The application will be live at: `https://yourdomain.com/calrims`

---

## 7. Automated CI/CD (GitHub Actions)

Every push to `main` automatically deploys to your server. To enable this:

1. Go to your GitHub repository → **Settings → Secrets and variables → Actions**.
2. Add the following repository secrets:

| Secret Name | Value |
| :--- | :--- |
| `VPS_HOST` | Your server IP or domain |
| `VPS_USER` | SSH user (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Contents of your server's private SSH key |

3. From now on, every `git push origin main` will:
   - SSH into your server
   - Pull the latest code
   - Run `deploy-zero-downtime.sh` automatically

---

## 8. Zero-Downtime Updates

For manual updates or rollouts, use the blue/green deployment script:

```bash
cd /var/www/rims
git pull origin main
./deploy-zero-downtime.sh
```

### How it works

1. Detects whether `blue` or `green` is currently live.
2. Builds and starts the **inactive** environment in the background.
3. Waits up to 120 seconds for the new environment's health check to pass (`/health`).
4. If healthy → rewrites `nginx.conf` to route all traffic to the new environment and reloads Nginx **without dropping connections**.
5. If unhealthy → stops the new environment and exits — **the old environment stays live with zero downtime**.
6. The old environment is kept running for 15 minutes for instant rollback.

### Manual rollback

```bash
# Switch nginx back to the previous environment manually
sed -i 's/frontend_green:3000/frontend_blue:3000/g' nginx.conf
sed -i 's/backend_green:10000/backend_blue:10000/g' nginx.conf
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
```

---

## 9. Security Hardening Checklist

Complete these steps **before** going live with real data:

- [ ] Change all default passwords immediately after first login
- [ ] Set `ALLOWED_ORIGINS` to **only** your production domain — never `*`
- [ ] Rotate `JWT_SECRET` and `ENCRYPTION_KEY` from any test values
- [ ] Confirm SSL certificate is valid (`https://yourdomain.com` shows a padlock)
- [ ] Confirm HTTP redirects to HTTPS (try `http://yourdomain.com`)
- [ ] Restrict SSH access to known IPs (server firewall / security group)
- [ ] Enable Supabase Row-Level Security (RLS) policies if direct DB access is needed
- [ ] Set up log monitoring (e.g. `docker compose logs -f backend_blue`)
- [ ] Schedule automatic SSL renewal: `sudo crontab -e` → add `0 3 * * * certbot renew --quiet`

---

## 10. Post-Launch: First Login & Admin Setup

1. Navigate to `https://yourdomain.com/calrims/auth/register`.
2. Register the **first Super Admin** account.
3. All subsequent HR users can be invited from **Dashboard → Settings → User Management**.

### Recommended first-time settings

Go to **Dashboard → Settings** and configure:

| Setting | Recommended Action |
| :--- | :--- |
| **Company Name** | Set your company's legal name (used in offer letters) |
| **Company Logo** | Upload your logo (appears on ID cards and offer PDFs) |
| **Offer Letter Template** | Customise the default HTML template before issuing any offers |
| **IMAP Mailbox** | Add the careers mailbox credentials for email resume ingestion |
| **SMTP "From" Name** | Set to something like `"RIMS Recruitment · Your Company"` |

---

## 11. Troubleshooting

### Containers won't start

```bash
# Check logs for the failing container
docker compose -f docker-compose.prod.yml logs backend_blue --tail=50
docker compose -f docker-compose.prod.yml logs frontend_blue --tail=50
```

Common causes:
- Missing or malformed `.env` variable (backend exits with `CRITICAL` log)
- Port 80 / 443 already in use by another process (`sudo lsof -i :80`)
- SSL certificate path wrong in `nginx.conf`

### Database connection error

- Verify `DATABASE_URL` is the full Supabase **connection string URI** (not the host-only string).
- Ensure your server's outbound IP is **not blocked** by Supabase (check Supabase → Settings → Database → Connection Pooling).

### Emails not sending

- Confirm `SMTP_USER` and `SMTP_PASSWORD` are correct.
- If using Gmail, the password **must** be a [16-character App Password](https://myaccount.google.com/apppasswords) — not your regular Gmail password.
- Check the backend logs: `docker compose -f docker-compose.prod.yml logs backend_blue | grep SMTP`

### Deployment script fails at health check

```bash
# Check why the backend is unhealthy
docker inspect --format='{{json .State.Health}}' rims-backend_blue-1
docker logs rims-backend_blue-1 --tail=30
```

### AI parsing not running

- Confirm `GROQ_API_KEY` is set and valid at [console.groq.com](https://console.groq.com).
- Go to **Dashboard → Reliability Monitor** and click **Force Retry** on any failed jobs.

---

*For architectural questions, refer to `backend/app/domain/models.py` (database schema) and `backend/app/api/` (route handlers).*

*Last updated: May 2026*
