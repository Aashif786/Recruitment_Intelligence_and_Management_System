-- Migration: Add composite index for duplicate detection on attachment_resumes table
-- Date: 2026-05-29
-- Purpose: Optimize duplicate detection queries using (sender_email, subject, received_at)
-- Related: email-inbox-edge-cases-fix spec, Task 1.2

-- Add composite index for duplicate detection
-- This index optimizes queries that check for duplicate emails based on sender, subject, and received time
CREATE INDEX IF NOT EXISTS ix_attachment_resumes_duplicate_detection 
ON attachment_resumes (sender_email, subject, received_at);

-- Add comment for documentation
COMMENT ON INDEX ix_attachment_resumes_duplicate_detection IS 'Composite index for optimizing duplicate email detection queries';
