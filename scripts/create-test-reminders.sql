-- Create Test Reminders: One Overdue (Jan 4) and One Today (Feb 6)
-- Both reminders will be sent to thomas@communitaslabs.io

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
  user_info.id,
  'before_start',
  days_offset,
  'user',
  user_info.id,
  custom_message,
  scheduled_date,
  'pending'
FROM user_info
CROSS JOIN (
  VALUES 
    (0, 'TEST REMINDER (Overdue): Scheduled for January 4, 2026', '2026-01-04'::date),
    (0, 'TEST REMINDER (Today): Scheduled for February 6, 2026', CURRENT_DATE)
) AS reminders(days_offset, custom_message, scheduled_date)
RETURNING id, scheduled_date, status, custom_message;

-- Verify both reminders were created
SELECT 
  r.id,
  r.scheduled_date,
  r.status,
  r.custom_message,
  CASE 
    WHEN r.scheduled_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN r.scheduled_date = CURRENT_DATE THEN 'TODAY'
    ELSE 'FUTURE'
  END as reminder_timing,
  p.email as recipient
FROM activity_reminders r
LEFT JOIN profiles p ON r.recipient_user_id = p.id
WHERE r.item_id = '2d80c0be-f481-4e88-8542-ff06fae78802'
AND r.status = 'pending'
ORDER BY r.scheduled_date;
