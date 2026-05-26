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
                                  PostgreSQL            Supabase Storage
                                  (SQLAlchemy 2.0        (resumes, photos,
                                   + Alembic)            offer PDFs)
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
│   ├── tests/                # Pytest test suite
│   ├── scripts/              # One-off migration/maintenance scripts
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
├── database/                 # SQL schema & seed files
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
| PostgreSQL | 14 + |

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

pip install -r requirements.txt
cp .env.example .env          # fill in the values below
python -m uvicorn app.main:app --reload --port 10000
```

**Interactive API docs:** http://localhost:10000/docs

#### Required `.env` variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rims

# Auth
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256

# AI Providers (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# Supabase Storage
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=rims-files

# Email (SMTP — for offer letters & notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# App
FRONTEND_URL=http://localhost:3000
```

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

**App URL:** http://localhost:3000

### 4 — Default Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@company.com` | `password123` |
| **HR Manager** | `hr@company.com` | `password123` |

> ⚠️ Change all default passwords immediately on first login in any environment other than local dev.

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
| [PROJECT_REPORT.md](./PROJECT_REPORT.md) | Technical design decisions and implementation notes |
| [DATABASE_SCHEMA.sql](./database/) | Full relational schema |

---

**Built with ❤️ by the CALRIMS team.**
