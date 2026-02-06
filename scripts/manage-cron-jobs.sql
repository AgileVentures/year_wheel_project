-- Comprehensive Cron Job Management Query
-- Run this in Supabase SQL Editor to view and manage all cron jobs

-- ============================================================================
-- 1. LIST ALL ACTIVE CRON JOBS
-- ============================================================================

SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  database,
  username
FROM cron.job
ORDER BY jobname;

-- ============================================================================
-- 2. VIEW RECENT CRON JOB RUNS (with status)
-- ============================================================================

SELECT 
  j.jobname,
  h.runid,
  h.job_pid,
  h.status,
  h.return_message,
  h.start_time,
  h.end_time,
  (h.end_time - h.start_time) AS duration
FROM cron.job j
LEFT JOIN cron.job_run_details h ON j.jobid = h.jobid
ORDER BY h.start_time DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- 3. DELETE A CRON JOB (uncomment and modify to use)
-- ============================================================================

-- To delete a specific cron job:
-- SELECT cron.unschedule('job_name_here');

-- ============================================================================
-- 4. MANUAL TEST FUNCTIONS
-- ============================================================================

-- Test cleanup_uninstalled_monday_users:
-- SELECT cleanup_uninstalled_monday_users();

-- Test check_activity_reminders (via edge function):
-- This runs via Supabase Edge Function, not directly in SQL

-- ============================================================================
-- 5. SCHEDULE NEW CRON JOB (template)
-- ============================================================================

-- Template for scheduling a new cron job:
-- SELECT cron.schedule(
--   'job_name',
--   '0 * * * *', -- Cron schedule (every hour)
--   $$SELECT your_function_name()$$
-- );

-- Common schedules:
-- '0 * * * *'      -- Every hour
-- '0 0 * * *'      -- Daily at midnight
-- '0 3 * * *'      -- Daily at 3 AM
-- '*/15 * * * *'   -- Every 15 minutes
-- '0 0 * * 0'      -- Weekly on Sunday at midnight
-- '0 0 1 * *'      -- Monthly on the 1st at midnight
