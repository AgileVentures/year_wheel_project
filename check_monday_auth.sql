-- Check Monday users table
SELECT 
  mu.monday_user_id,
  mu.monday_user_name,
  mu.monday_email,
  mu.profile_id,
  p.email as yearwheel_email,
  p.is_admin,
  mu.subscription_status,
  mu.current_plan,
  mu.created_at,
  mu.last_active_at
FROM monday_users mu
LEFT JOIN profiles p ON mu.profile_id = p.id
ORDER BY mu.created_at DESC;

-- Check if your admin profile exists
SELECT id, email, is_admin, created_at
FROM profiles
WHERE is_admin = true
ORDER BY created_at DESC;
