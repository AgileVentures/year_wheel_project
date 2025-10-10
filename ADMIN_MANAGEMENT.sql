-- =====================================================
-- ADMIN MANAGEMENT
-- Quick commands to add/remove admin users
-- =====================================================

-- ============== ADD ADMIN ==============

-- Add admin by email (replace with actual email)
UPDATE public.profiles
SET is_admin = true
WHERE email = 'user@example.com';

-- Verify admin was added
SELECT id, email, is_admin, created_at
FROM public.profiles
WHERE email = 'user@example.com';

-- ============== REMOVE ADMIN ==============

-- Remove admin by email (replace with actual email)
UPDATE public.profiles
SET is_admin = false
WHERE email = 'user@example.com';

-- ============== LIST ALL ADMINS ==============

SELECT 
  p.email,
  p.is_admin,
  p.created_at,
  s.plan_type,
  s.status as subscription_status,
  public.is_premium_user(p.id) as has_premium_access
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id
WHERE p.is_admin = true
ORDER BY p.created_at DESC;

-- ============== CHECK SPECIFIC USER ==============

-- Check if a user is admin and their access level
SELECT 
  p.email,
  p.is_admin,
  public.is_admin(p.id) as admin_check,
  public.is_premium_user(p.id) as has_premium_access,
  s.plan_type,
  s.status as subscription_status
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id
WHERE p.email = 'thomas@freefoot.se';

-- ============== BULK ADD ADMINS ==============

-- Add multiple admins at once
UPDATE public.profiles
SET is_admin = true
WHERE email IN (
  'thomas@freefoot.se',
  'admin2@example.com',
  'admin3@example.com'
);

-- Verify bulk add
SELECT email, is_admin 
FROM public.profiles 
WHERE email IN (
  'thomas@freefoot.se',
  'admin2@example.com',
  'admin3@example.com'
);

-- ============== NOTES ==============
-- 
-- Admins automatically get:
-- - All premium features
-- - Unlimited wheels
-- - Unlimited team members
-- - All export formats
-- - Version control access
-- - Sharing capabilities
-- 
-- Admins do NOT need to have an active subscription.
-- The is_premium_user() function returns TRUE for admins.
--
