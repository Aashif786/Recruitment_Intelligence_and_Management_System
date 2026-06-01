-- Migration: Add retry tracking fields to attachment_resumes table
-- Date: 2026-05-29
-- Purpose: Support email inbox edge cases fix - track retry attempts and error messages
-- Related: email-inbox-edge-cases-fix spec, Task 1.1

-- Add retry_count field to track number of processing attempts
ALTER TABLE attachment_resumes 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add last_error field to store error messages for debugging
ALTER TABLE attachment_resumes 
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Add comment for documentation
COMMENT ON COLUMN attachment_resumes.retry_count IS 'Number of times processing has been retried for this resume';
COMMENT ON COLUMN attachment_resumes.last_error IS 'Last error message encountered during processing';















