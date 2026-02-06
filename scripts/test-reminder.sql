-- Test Reminder Creation
-- Creates a test reminder for today to verify the reminder system works

-- ============================================================================
-- 1. GET ITEM DETAILS
-- ============================================================================
SELECT 
  id,
  name,
  start_date,
  end_date,
  wheel_id,
  status
FROM items
WHERE id = '2d80c0be-f481-4e88-8542-ff06fae78802';

-- ============================================================================
-- 2. GET YOUR USER ID
-- ============================================================================
-- Get the user ID of the wheel owner or a team member
SELECT 
  user_id,
  p.email,
  p.full_name
FROM year_wheels yw
JOIN profiles p ON p.id = yw.user_id
WHERE yw.id = '2086b943-f081-4bc9-b341-a69e1c67706c';

-- Or get your own user ID by email:
SELECT id, email, full_name FROM profiles WHERE email = 'thomas@communitaslabs.io';

-- Check what today's date is:
SELECT CURRENT_DATE AS today, NOW() AS current_time;

-- ============================================================================
-- 3. CREATE TEST REMINDER FOR TODAY (Feb 6, 2026)
-- ============================================================================
-- This will create a reminder that should fire immediately on next cron run
-- Uses your email to automatically get your user ID

WITH user_info AS (
  SELECT id FROM profiles WHERE email = 'thomas@communitaslabs.io'
)
INSERT INTO activity_reminders (
  item_id,
  wheel_id,
  created_by,
  reminder_type,
  days_offset,
  recipient_type,
  recipient_user_id,
  custom_message,
  scheduled_date,
  status
)
SELECT
  '2d80c0be-f481-4e88-8542-ff06fae78802'::uuid,
  '2086b943-f081-4bc9-b341-a69e1c67706c'::uuid,
  user_info.id, -- Automatically uses your user ID
  'before_start', -- Type of reminder
  0, -- 0 days offset (today)
  'user', -- Send to specific user
  user_info.id, -- Sends to you
  'TEST REMINDER: This is a test reminder to verify the system is working on ' || CURRENT_DATE::TEXT, -- Custom message
  CURRENT_DATE, -- TODAY'S DATE (2026-02-06)
  'pending' -- Status
FROM user_info
RETURNING id, scheduled_date, status, custom_message;

-- ============================================================================
-- 4. VERIFY THE REMINDER WAS CREATED
-- ============================================================================
SELECT 
  r.id,
  r.item_id,
  i.name as item_name,
  r.reminder_type,
  r.scheduled_date,
  r.status,
  r.custom_message,
  p.email as recipient_email,
  p.full_name as recipient_name
FROM activity_reminders r
JOIN items i ON r.item_id = i.id
LEFT JOIN profiles p ON r.recipient_user_id = p.id
WHERE r.item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
ORDER BY r.created_at DESC
LIMIT 5;

-- ============================================================================
-- 5. TEST THE REMINDER FUNCTION (returns pending reminders for today)
-- ============================================================================
SELECT * FROM get_pending_reminders_for_date(CURRENT_DATE);

-- ============================================================================
-- 6. TRIGGER THE EDGE FUNCTION MANUALLY
-- ============================================================================
-- After creating the reminder, run this curl command to trigger immediate send:
-- 
-- curl -X POST \
--   'https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/check-activity-reminders' \
--   -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teXN2dXltemFic3Rub2JkZnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM1MzQsImV4cCI6MjA3NTQ3OTUzNH0.FcfdndrESts9rhEMU-KMoNsDEHWlK4-6KdPLyr3qaRQ' \
--   -H 'Content-Type: application/json'

-- ============================================================================
-- 7. CHECK IF EMAIL WAS SENT
-- ============================================================================
SELECT 
  r.id,
  i.name as item_name,
  r.scheduled_date,
  r.status,
  r.sent_at,
  r.email_id,
  r.error_message,
  p.email as recipient_email
FROM activity_reminders r
JOIN items i ON r.item_id = i.id
LEFT JOIN profiles p ON r.recipient_user_id = p.id
WHERE r.item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
ORDER BY r.created_at DESC;

-- ============================================================================
-- CLEANUP: DELETE OLD/TEST REMINDERS
-- ============================================================================

-- Delete the January reminders (overdue):
DELETE FROM activity_reminders 
WHERE item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
AND scheduled_date < CURRENT_DATE
RETURNING id, scheduled_date, custom_message;

-- Delete today's test reminder (after testing):
-- DELETE FROM activity_reminders 
-- WHERE item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
-- AND custom_message LIKE 'TEST REMINDER:%'
-- AND scheduled_date = CURRENT_DATE;

-- Delete ALL test reminders for this item:
-- DELETE FROM activity_reminders 
-- WHERE item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
-- AND custom_message LIKE 'TEST REMINDER:%';
