# Database Migrations

This directory contains SQL migration files for the CALRIMS database schema.

## Migration Files

### 20260408204544_initial_schema.sql
Initial database schema for CALRIMS, including all core tables (users, jobs, applications, interviews, etc.).

### 20260529151121_add_retry_tracking_to_attachment_resumes.sql
Adds retry tracking fields to the `attachment_resumes` table:
- `retry_count` (INTEGER, default 0): Tracks the number of processing retry attempts
- `last_error` (TEXT): Stores the last error message encountered during processing

**Purpose**: Supports the email inbox edge cases fix by enabling retry logic and error tracking for failed email ingestion operations.

**Related Spec**: `email-inbox-edge-cases-fix`

## Applying Migrations

### Option 1: Automatic (Recommended for Development)
The application automatically applies migrations on startup via `app/migrations.py`. Simply start the backend server:

```bash
cd backend
python run_server.py
```

### Option 2: Manual (Supabase SQL Editor)
For production or manual application:

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of the migration file
4. Execute the SQL

### Option 3: Supabase CLI
If using Supabase CLI:

```bash
supabase db push
```

## Testing Migrations

### Quick Test (Configuration Only)
Verifies that migrations are configured in `app/migrations.py`:

```bash
cd backend
python test_migration.py
```

### Comprehensive Test (Database + Data Operations)
Tests migration configuration, database schema, and data operations:

```bash
cd backend
python test_attachment_resume_migration_db.py
```

This test will:
1. Verify migration configuration in `migrations.py`
2. Check that columns exist in the database
3. Test inserting and updating records with the new fields
4. Clean up test data

## Migration Naming Convention

Migration files follow the format:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260529151121_add_retry_tracking_to_attachment_resumes.sql`

## Rollback

To rollback a migration, create a new migration file that reverses the changes. For example, to rollback the retry tracking migration:

```sql
-- Rollback: Remove retry tracking fields from attachment_resumes
ALTER TABLE attachment_resumes DROP COLUMN IF EXISTS retry_count;
ALTER TABLE attachment_resumes DROP COLUMN IF EXISTS last_error;
```

**Note**: Always test rollbacks in a development environment first.
