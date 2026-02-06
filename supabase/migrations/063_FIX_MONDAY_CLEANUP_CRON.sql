-- Migration: Manage Cron Jobs
-- Description: List all cron jobs and fix cleanup_uninstalled_monday_users error
-- Author: AI Assistant
-- Date: 2026-02-06

-- ============================================================================
-- 1. LIST ALL CRON JOBS
-- ============================================================================
-- This shows all scheduled cron jobs in the database

SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobid;

-- Expected cron jobs:
-- 1. check-activity-reminders (daily at 9 AM UTC) - Sends reminder emails
-- 2. cleanup_uninstalled_monday_users (daily at 3 AM) - Anonymizes deleted user data

-- ============================================================================
-- 2. FIX cleanup_uninstalled_monday_users FUNCTION
-- ============================================================================
-- Error: column "anonymized" does not exist in monday_subscription_events

-- Drop the old function
DROP FUNCTION IF EXISTS cleanup_uninstalled_monday_users();

-- Recreate without the anonymized column
CREATE OR REPLACE FUNCTION cleanup_uninstalled_monday_users()
RETURNS void AS $$
BEGIN
  -- Anonymize uninstalled users older than 10 days (GDPR compliance)
  UPDATE monday_users
  SET 
    email = 'deleted-' || id || '@yearwheel.local',
    name = 'Deleted User',
    monday_account_name = NULL,
    monday_account_slug = NULL,
    country_code = NULL
  WHERE uninstalled_at IS NOT NULL
    AND uninstalled_at < NOW() - INTERVAL '10 days'
    AND email NOT LIKE 'deleted-%';
  
  -- Anonymize subscription events for uninstalled users (remove monday_user_id reference)
  UPDATE monday_subscription_events
  SET monday_user_id = NULL
  WHERE monday_user_id IN (
    SELECT id FROM monday_users 
    WHERE uninstalled_at IS NOT NULL 
      AND uninstalled_at < NOW() - INTERVAL '10 days'
  )
  AND monday_user_id IS NOT NULL;
  
  RAISE NOTICE 'Cleanup completed: anonymized uninstalled monday users older than 10 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. SCHEDULE THE FIXED CRON JOB (if not already scheduled)
-- ============================================================================

-- Remove old job if exists
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'cleanup_uninstalled_monday_users';

-- Schedule to run daily at 3 AM
SELECT cron.schedule(
  'cleanup_uninstalled_monday_users',
  '0 3 * * *', -- Daily at 3 AM
  $$SELECT cleanup_uninstalled_monday_users()$$
);

-- ============================================================================
-- 4. VERIFY CRON JOBS
-- ============================================================================

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  LEFT(command, 100) AS command_preview
FROM cron.job
ORDER BY jobname;

-- ============================================================================
-- 5. CHECK RECENT CRON JOB RUNS (with errors)
-- ============================================================================

SELECT 
  j.jobname,
  h.runid,
  h.status,
  h.return_message,
  h.start_time,
  h.end_time,
  (h.end_time - h.start_time) AS duration
FROM cron.job j
LEFT JOIN cron.job_run_details h ON j.jobid = h.jobid
WHERE h.status IS NOT NULL
ORDER BY h.start_time DESC
LIMIT 20;

-- ============================================================================
-- NOTES
-- ============================================================================
-- To manually test the cleanup function:
-- SELECT cleanup_uninstalled_monday_users();
--
-- To unschedule a cron job:
-- SELECT cron.unschedule('job_name_here');
