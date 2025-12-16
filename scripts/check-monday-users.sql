-- Check Monday.com webhook test data
-- Run this in Supabase SQL Editor after running test script

-- Check test user record
SELECT 
  id,
  monday_user_id,
  email,
  name,
  subscription_status,
  current_plan,
  is_trial,
  trial_ends_at,
  created_at,
  updated_at
FROM monday_users
WHERE monday_user_id = 99999;

-- Check all events for test user
SELECT 
  e.id,
  e.event_type,
  e.plan_id,
  e.created_at,
  e.event_data->>'type' as webhook_type
FROM monday_subscription_events e
JOIN monday_users u ON e.monday_user_id = u.id
WHERE u.monday_user_id = 99999
ORDER BY e.created_at DESC;

-- Summary of all Monday users
SELECT 
  subscription_status,
  current_plan,
  COUNT(*) as count
FROM monday_users
GROUP BY subscription_status, current_plan
ORDER BY count DESC;

-- All Monday users (recent first)
SELECT 
  monday_user_id,
  email,
  name,
  subscription_status,
  current_plan,
  is_trial,
  created_at
FROM monday_users
ORDER BY created_at DESC
LIMIT 20;
