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
-- 2. CREATE TEST REMINDER FOR TODAY
-- ============================================================================
-- This will create a reminder that should fire immediately on next cron run

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
VALUES (
  '2d80c0be-f481-4e88-8542-ff06fae78802',
  '2086b943-f081-4bc9-b341-a69e1c67706c',
  auth.uid(), -- Current logged in user
  'before_start', -- Type of reminder
  0, -- 0 days offset (today)
  'user', -- Send to specific user
  auth.uid(), -- Send to me
  'TEST REMINDER: This is a test reminder to verify the system is working.', -- Custom message
  CURRENT_DATE, -- Today's date
  'pending' -- Status
)
RETURNING *;

-- ============================================================================
-- 3. VERIFY THE REMINDER WAS CREATED
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
-- 4. TEST THE REMINDER FUNCTION (returns pending reminders for today)
-- ============================================================================
SELECT * FROM get_pending_reminders_for_date(CURRENT_DATE);

-- ============================================================================
-- 5. TRIGGER THE EDGE FUNCTION MANUALLY
-- ============================================================================
-- After creating the reminder, run this curl command to trigger immediate send:
-- 
-- curl -X POST \
--   'https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/check-activity-reminders' \
--   -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teXN2dXltemFic3Rub2JkZnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDM1MzQsImV4cCI6MjA3NTQ3OTUzNH0.FcfdndrESts9rhEMU-KMoNsDEHWlK4-6KdPLyr3qaRQ' \
--   -H 'Content-Type: application/json'

-- ============================================================================
-- 6. CHECK IF EMAIL WAS SENT
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
-- CLEANUP: DELETE TEST REMINDER (run after testing)
-- ============================================================================
-- DELETE FROM activity_reminders 
-- WHERE item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
-- AND custom_message LIKE 'TEST REMINDER:%';
