-- =============================================
-- DIAGNOSE RLS POLICY ISSUES
-- =============================================
-- Run this to understand why team members still get 403 errors

-- =============================================
-- STEP 1: Check if RLS is enabled
-- =============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
ORDER BY tablename;

-- =============================================
-- STEP 2: List all current policies
-- =============================================
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
ORDER BY tablename, cmd, policyname;

-- =============================================
-- STEP 3: Check team membership
-- =============================================
-- Replace WHEEL_ID with the actual wheel ID from the error
-- This will show if you're actually a team member
SELECT 
  yw.id as wheel_id,
  yw.title,
  yw.team_id,
  yw.user_id as owner_id,
  tm.user_id as member_id,
  auth.uid() as current_user_id,
  CASE 
    WHEN yw.user_id = auth.uid() THEN 'You are the owner'
    WHEN tm.user_id = auth.uid() THEN 'You are a team member'
    ELSE 'You have no access'
  END as access_status
FROM year_wheels yw
LEFT JOIN team_members tm ON tm.team_id = yw.team_id
WHERE yw.id = 'REPLACE_WITH_WHEEL_ID';  -- Put the actual wheel ID here

-- =============================================
-- STEP 4: Test policy logic manually
-- =============================================
-- Replace WHEEL_ID with actual wheel ID
-- This checks if the policy logic would work
SELECT 
  EXISTS (
    SELECT 1 FROM public.year_wheels
    WHERE year_wheels.id = 'REPLACE_WITH_WHEEL_ID'
    AND (
      year_wheels.user_id = auth.uid()
      OR (
        year_wheels.team_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.team_members
          WHERE team_members.team_id = year_wheels.team_id
          AND team_members.user_id = auth.uid()
        )
      )
    )
  ) as should_have_access;

-- =============================================
-- STEP 5: Check for conflicting policies
-- =============================================
-- If there are multiple policies with RESTRICTIVE, they might conflict
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('year_wheels', 'wheel_rings', 'ring_data', 'activity_groups', 'labels', 'items')
GROUP BY tablename
ORDER BY tablename;

-- =============================================
-- STEP 6: Test a simple INSERT on ring_data
-- =============================================
-- This will fail with the actual error message
-- Replace with real values from your wheel
/*
INSERT INTO ring_data (ring_id, month_index, content)
VALUES ('REPLACE_WITH_RING_ID', 0, 'Test content');
*/

-- =============================================
-- POTENTIAL ISSUES TO CHECK:
-- =============================================
-- 1. Did the policies actually get created? (Check STEP 2 output)
-- 2. Are you actually a team member? (Check STEP 3 output)
-- 3. Is the wheel assigned to a team? (Check STEP 3 output)
-- 4. Are there old conflicting policies? (Check STEP 5 output)
-- 5. Is RLS even enabled? (Check STEP 1 output)

-- =============================================
-- COMMON FIXES:
-- =============================================

-- FIX 1: If policies don't exist, run APPLY_TEAM_COLLABORATION_FIX.sql again

-- FIX 2: If you're not a team member, add yourself:
/*
INSERT INTO team_members (team_id, user_id, role)
VALUES ('TEAM_ID', auth.uid(), 'member');
*/

-- FIX 3: If wheel has no team_id, assign it to a team:
/*
UPDATE year_wheels
SET team_id = 'YOUR_TEAM_ID'
WHERE id = 'WHEEL_ID';
*/

-- FIX 4: If there are old policies causing conflicts, drop them all and rerun:
/*
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ring_data;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.ring_data;
-- etc for any other old policies
*/
