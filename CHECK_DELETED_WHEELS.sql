-- =====================================================
-- CHECK FOR DELETED WHEELS
-- Run this in Supabase SQL Editor to verify wheel deletion
-- =====================================================

-- 1. Check all wheels for current user
SELECT 
  id,
  title,
  created_at,
  updated_at,
  user_id
FROM public.year_wheels
WHERE user_id = auth.uid()
ORDER BY created_at DESC;

-- 2. Get wheel count for current user
SELECT COUNT(*) as total_wheels
FROM public.year_wheels
WHERE user_id = auth.uid();

-- 3. Check if any "orphaned" data exists (data without parent wheels)
-- This would indicate CASCADE delete isn't working

-- Orphaned rings
SELECT 
  'wheel_rings' as table_name,
  COUNT(*) as orphaned_count
FROM public.wheel_rings wr
WHERE NOT EXISTS (
  SELECT 1 FROM public.year_wheels yw
  WHERE yw.id = wr.wheel_id
);

-- Orphaned pages
SELECT 
  'wheel_pages' as table_name,
  COUNT(*) as orphaned_count
FROM public.wheel_pages wp
WHERE NOT EXISTS (
  SELECT 1 FROM public.year_wheels yw
  WHERE yw.id = wp.wheel_id
);

-- Orphaned activity groups
SELECT 
  'activity_groups' as table_name,
  COUNT(*) as orphaned_count
FROM public.activity_groups ag
WHERE NOT EXISTS (
  SELECT 1 FROM public.year_wheels yw
  WHERE yw.id = ag.wheel_id
);

-- Orphaned items
SELECT 
  'items' as table_name,
  COUNT(*) as orphaned_count
FROM public.items i
WHERE NOT EXISTS (
  SELECT 1 FROM public.year_wheels yw
  WHERE yw.id = i.wheel_id
);

-- 4. Manual wheel count check (should match get_user_wheel_count function)
SELECT public.get_user_wheel_count(auth.uid()) as function_wheel_count;

-- 5. Check subscription limits
SELECT 
  s.status,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  public.is_premium_user(auth.uid()) as is_premium,
  public.can_create_wheel(auth.uid()) as can_create_wheel,
  public.get_user_wheel_count(auth.uid()) as current_wheel_count
FROM public.subscriptions s
WHERE s.user_id = auth.uid();

-- =====================================================
-- INSTRUCTIONS:
-- 1. Run query #1 to see all your wheels
-- 2. Run query #2 to see total count
-- 3. Run queries #3 to check for orphaned data (should all be 0)
-- 4. Run query #4 to verify the count function works
-- 5. Run query #5 to check your subscription status
-- 
-- If orphaned_count > 0, CASCADE delete isn't working properly
-- If total_wheels > 0 but you deleted all wheels, they weren't deleted
-- =====================================================
