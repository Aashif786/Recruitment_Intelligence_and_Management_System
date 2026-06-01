# CALRIMS — AI-Powered Recruitment Information Management System

> An end-to-end, production-ready hiring platform that automates the full candidate journey — from intelligent AI interviews and smart resume parsing to offer management, onboarding, and compliance reporting.

---

## ✨ Feature Highlights

| Area | What it does |
| :--- | :--- |
| **AI Interview Engine** | Adaptive voice/text interviews with real-time LLM evaluation (OpenAI · Anthropic · Groq) |
| **Smart Resume Screening** | Automated skill extraction, job-fit scoring, and ranking powered by LLMs |
| **Email Resume Ingestion** | IMAP-based mailbox sync — resumes land in an inbox and are parsed automatically |
| **Candidate Pipeline** | Kanban-style pipeline with a state-machine that enforces legal transitions |
| **Offer Letter Management** | HTML template editor → immutable PDF generation → secure candidate accept/reject portal |
| **Onboarding Pipeline** | Photo capture, ID card generation, and joining confirmation — all in one workflow |
| **Analytics & Reports** | Hiring funnel metrics, time-to-hire, diversity stats, and custom report exports |
| **Reliability Monitor** | Super Admin panel to retry stuck AI parse jobs without developer intervention |
| **Ticket & Support** | HR and candidate-facing support ticket system |
| **Audit Trail** | Every critical action (state changes, offer decisions, logins) is logged immutably |
| **RBAC** | Fine-grained roles: Candidate · HR Manager · Super Admin |
| **Dark / Light Mode** | Full theming with glassmorphism UI and Framer Motion animations |

---

## 🛠️ Architecture

```
┌──────────────────────┐        ┌──────────────────────────────────────┐
│  Next.js 15 Frontend │◄──────►│  FastAPI Backend  (port 10000)       │
│  (TypeScript · App   │  REST  │  ├── app/api/        (route handlers) │
│   Router · SWR)      │        │  ├── app/services/   (business logic) │
└──────────────────────┘        │  ├── app/domain/     (models/schemas) │
                                │  └── app/core/       (auth/config)    │
                                └──────┬──────────────────────┬─────────┘
                                       │                      │
                                  Supabase (PostgreSQL)   Supabase Storage
                                  (SQLAlchemy + startup   (resumes, photos,
                                   migrations)            offer PDFs)
                                       │
                              AI Providers (OpenAI / Anthropic / Groq)
```

---

## 📁 Directory Structure

```
rims/
├── backend/
│   ├── app/
│   │   ├── api/              # Route handlers (applications, interviews, onboarding, …)
│   │   ├── services/         # Business logic (AI, email, state machine, offer letters, …)
│   │   ├── domain/           # SQLAlchemy models & Pydantic schemas
│   │   ├── core/             # Auth, config, storage, timezone helpers
│   │   └── infrastructure/   # Database session & migrations
│   ├── scripts/              # Production startup scripts
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── auth/             # Login, Register, Forgot/Reset Password, Verify OTP
│   │   ├── dashboard/
│   │   │   ├── hr/           # Applications, Jobs, Pipeline, Reports, Ingested Emails, …
│   │   │   ├── onboarding/   # Offer management, photo capture, ID card, joining
│   │   │   ├── repository/   # Candidate resume repository
│   │   │   └── settings/     # Global settings & offer letter template editor
│   │   ├── interview/        # Candidate-facing live interview room
│   │   ├── offer/            # Candidate offer accept/reject portal
│   │   ├── jobs/             # Public job listings
│   │   └── page.tsx          # Marketing landing page
│   ├── components/           # Shared UI components (Shadcn UI + custom)
│   └── package.json
├── setup/                    # Client production schema (see CLIENT_SETUP_GUIDE.md)
├── supabase/migrations/      # Supabase migration history
├── docker-compose.prod.yml   # Production orchestration
├── ONBOARDING_GUIDE.md       # Onboarding pipeline & offer letter guide
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
| :--- | :--- |
| Node.js | 18.x + |
| Python | 3.10 – 3.12 |
| [Supabase](https://supabase.com) project | PostgreSQL + Storage (see [CLIENT_SETUP_GUIDE.md](./CLIENT_SETUP_GUIDE.md)) |

### 1 — Clone & configure

```bash
git clone https://github.com/caldimengg-manikandan/rims.git
cd rims
```

### 2 — Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

cp .env.example .env          # fill in Supabase + secrets (see below)
```

**Dependencies:** `.\start.ps1` installs from `requirements_core.txt` (slim local set). **Docker/production** uses `backend/requirements.txt`. The repo-root `requirements.txt` is a minimal gunicorn/uvicorn pin only.

**Windows (recommended):**

```powershell
.\start.ps1
```

**macOS / Linux (manual):**

```bash
export BACKEND_START_MODE=script
python -m uvicorn app.main:app --reload --port 10000
```

**Production (Linux / Docker):** see [CLIENT_SETUP_GUIDE.md](./CLIENT_SETUP_GUIDE.md) and `docker-compose.prod.yml`.

**Interactive API docs:** http://localhost:10000/docs

#### Required `.env` variables

Copy from `backend/.env.example`. Minimum for local dev:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=                          # openssl rand -hex 32
ENCRYPTION_KEY=                      # Fernet key for phone encryption
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=                        # or OPENAI_API_KEY / ANTHROPIC_API_KEY
ENV=development
FRONTEND_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

> For a **new** Supabase project, run `setup/production_schema.sql` in the SQL Editor first (see CLIENT_SETUP_GUIDE §2.2), then start the backend.

### 3 — Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (see `frontend/.env.example`).

**App URL:** http://localhost:3000

#### HR Reports (optional checks)

- **Backend smoke:** from `backend/`, with `BACKEND_START_MODE=script` set, run `python scripts/verify_reports_module.py`.
- **Playwright (reports UI):** requires a running backend, frontend, and HR credentials:

```bash
cd frontend
npx playwright install chromium
set E2E_HR_EMAIL=hr@example.com
set E2E_HR_PASSWORD=your-password
npm run test:e2e:reports
```

Reports use a lightweight `/api/analytics/reports/heatmap` endpoint for the calendar and **Export all filtered** downloads the full filtered CSV (not just the current page).

### 4 — First admin user

Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `backend/.env` before the first backend start to bootstrap a Super Admin. Do **not** use default passwords in production.

---

## 🔑 Role Permissions

| Permission | Candidate | HR Manager | Super Admin |
| :--- | :---: | :---: | :---: |
| Apply for jobs / take interview | ✅ | — | — |
| View & manage applications | — | ✅ | ✅ |
| Create / edit job listings | — | ✅ | ✅ |
| Approve offer letters | — | — | ✅ |
| Access analytics & reports | — | ✅ | ✅ |
| Manage global settings | — | — | ✅ |
| View reliability monitor | — | — | ✅ |
| Manage HR user accounts | — | — | ✅ |

---

## 📚 Documentation

| Document | Purpose |
| :--- | :--- |
| [ONBOARDING_GUIDE.md](./ONBOARDING_GUIDE.md) | Offer pipeline, template editor, email ingestion, and photo/ID card workflow |
| [CLIENT_SETUP_GUIDE.md](./CLIENT_SETUP_GUIDE.md) | Production deployment checklist for client environments |
| [setup/production_schema.sql](./setup/production_schema.sql) | Full relational schema for new Supabase projects |
| [supabase/migrations/](./supabase/migrations/) | Same schema for Supabase CLI (`supabase db push`) |

---

**Built with ❤️ by the CALRIMS team.**
