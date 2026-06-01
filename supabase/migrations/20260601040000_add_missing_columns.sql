-- Migration: add columns present in SQLAlchemy models but absent from production schema
-- Safe to re-apply (IF NOT EXISTS / IF NOT EXISTS guards throughout).
-- Apply via Supabase SQL Editor or psql.

-- ============================================================================
-- 1. offers.offer_preview_count  (Offer model, nullable=False default 0)
--    Root cause of "Database error occurred" on login — any SQLAlchemy query
--    that joins/loads Offer rows fails because the column is missing.
-- ============================================================================
ALTER TABLE offers
    ADD COLUMN IF NOT EXISTS offer_preview_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. users — OTP brute-force protection columns
--    (otp_attempt_count, otp_locked_until)
-- ============================================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 3. interviews — extra columns added after initial schema
-- ============================================================================
ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS termination_reason VARCHAR(100);

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS report_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS candidate_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. Verify offers and onboardings tables exist (created by initial schema,
--    but older live DBs may pre-date them).
-- ============================================================================
CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    offer_sent BOOLEAN DEFAULT FALSE,
    offer_sent_date TIMESTAMP,
    offer_approval_status VARCHAR(20) DEFAULT 'pending',
    offer_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    offer_approved_at TIMESTAMP,
    offer_response_status VARCHAR(20) DEFAULT 'pending',
    offer_response_date TIMESTAMP,
    offer_token VARCHAR(100) UNIQUE,
    offer_short_id VARCHAR(20) UNIQUE,
    offer_token_expiry TIMESTAMP WITH TIME ZONE,
    offer_token_used BOOLEAN DEFAULT FALSE,
    offer_template_snapshot TEXT,
    offer_pdf_path VARCHAR(500),
    offer_accepted_ip VARCHAR(50),
    offer_accepted_user_agent TEXT,
    offer_email_status VARCHAR(20) DEFAULT 'pending',
    offer_email_retry_count INTEGER DEFAULT 0,
    reminder_sent_at TIMESTAMP,
    offer_preview_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS onboardings (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    joining_date TIMESTAMP,
    employee_id VARCHAR(50) UNIQUE,
    id_card_url VARCHAR(500),
    onboarded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offers_application_id ON offers(application_id);
CREATE INDEX IF NOT EXISTS idx_onboardings_application_id ON onboardings(application_id);
