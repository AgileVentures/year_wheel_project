-- =============================================
-- EMERGENCY DIAGNOSTIC: Why am I getting 403?
-- =============================================
-- Run this FIRST to understand the problem

-- Step 1: Who am I?
SELECT auth.uid() as my_user_id;

-- Step 2: Which wheel am I trying to edit?
-- Look at the browser URL - it should be like: /wheel/abc-123-def
-- The part after /wheel/ is the wheel_id
-- Replace WHEEL_ID_FROM_URL below with that value

-- Step 3: Check the wheel details
SELECT 
  id,
  title,
  user_id,
  team_id,
  created_at,
  updated_at
FROM year_wheels
WHERE id = 'PASTE_WHEEL_ID_FROM_URL_HERE';

-- Step 4: Check if policies exist for ring_data
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'ring_data'
AND schemaname = 'public';

-- Step 5: Check if I'm in the team
-- Use the team_id from Step 3
SELECT *
FROM team_members
WHERE team_id = 'PASTE_TEAM_ID_FROM_STEP_3_HERE'
AND user_id = auth.uid();

-- =============================================
-- INTERPRETATION:
-- =============================================
-- 
-- If Step 4 returns NO ROWS:
--   → The SQL migration wasn't applied
--   → Run COMPLETE_FIX_ALL_IN_ONE.sql
--
-- If Step 4 returns rows BUT Step 5 returns NO ROWS:
--   → You're not in the team_members table
--   → Run: INSERT INTO team_members (team_id, user_id, role)
--          VALUES ('team_id_from_step_3', auth.uid(), 'owner');
--
-- If Step 3 shows team_id IS NULL:
--   → The wheel isn't assigned to a team
--   → It should work with just user_id check
--   → This is a different problem
