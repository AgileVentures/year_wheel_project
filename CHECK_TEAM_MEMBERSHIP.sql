-- =============================================
-- STEP-BY-STEP: Fix Team Membership Issues
-- =============================================
-- IMPORTANT: Run each query SEPARATELY, one at a time!
-- Do NOT run the entire file at once!

-- =============================================
-- STEP 1: Find your user ID
-- =============================================
-- Copy and run ONLY this query:

SELECT auth.uid() as your_user_id;

-- Write down the UUID you get - you'll need it!


-- =============================================
-- STEP 2: Check ALL your wheels and their team assignments
-- =============================================
-- Copy and run ONLY this query:

SELECT 
  id as wheel_id,
  title,
  team_id,
  user_id as owner_id,
  CASE 
    WHEN user_id = auth.uid() THEN 'You own this wheel'
    WHEN team_id IS NULL THEN 'No team assigned'
    ELSE 'Team wheel'
  END as status
FROM year_wheels
WHERE user_id = auth.uid() OR team_id IS NOT NULL
ORDER BY updated_at DESC;

-- Find the wheel that's giving you 403 errors
-- Write down its wheel_id and team_id


-- =============================================
-- STEP 3: Check if you're in ANY teams
-- =============================================
-- Copy and run ONLY this query:

SELECT 
  tm.team_id,
  tm.user_id,
  tm.role,
  t.name as team_name
FROM team_members tm
LEFT JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = auth.uid();

-- If this returns NO rows, you're not in any teams!
-- If it returns rows, check if the team_id matches the wheel's team_id from Step 2


-- =============================================
-- STEP 4: See which wheels you SHOULD have access to
-- =============================================
-- Copy and run ONLY this query:

SELECT 
  yw.id as wheel_id,
  yw.title,
  yw.team_id,
  yw.user_id as owner_id,
  tm.user_id as your_membership,
  tm.role,
  CASE 
    WHEN yw.user_id = auth.uid() THEN '✅ Owner'
    WHEN tm.user_id IS NOT NULL THEN '✅ Team Member'
    ELSE '❌ NO ACCESS'
  END as access_status
FROM year_wheels yw
LEFT JOIN team_members tm ON tm.team_id = yw.team_id AND tm.user_id = auth.uid()
WHERE yw.team_id IS NOT NULL
ORDER BY yw.updated_at DESC;

-- Any wheel showing "❌ NO ACCESS" is the problem!


-- =============================================
-- STEP 5: FIX - Add yourself to the team
-- =============================================
-- ONLY run this if Step 4 showed "❌ NO ACCESS" for your wheel
-- 
-- First, get the team_id from Step 2 or Step 4 (it's a UUID like: a1b2c3d4-...)
-- Then UNCOMMENT and EDIT this query with the actual team_id:

/*
INSERT INTO team_members (team_id, user_id, role)
VALUES (
  'PASTE_TEAM_ID_HERE',  -- Replace this with actual UUID from Step 2/4
  auth.uid(), 
  'owner'
)
ON CONFLICT (team_id, user_id) DO NOTHING;
*/


-- =============================================
-- STEP 6: VERIFY the fix worked
-- =============================================
-- Copy and run ONLY this query after Step 5:

SELECT 
  yw.id as wheel_id,
  yw.title,
  yw.team_id,
  tm.user_id as your_membership,
  tm.role,
  CASE 
    WHEN yw.user_id = auth.uid() THEN '✅ Owner'
    WHEN tm.user_id IS NOT NULL THEN '✅ Team Member'
    ELSE '❌ STILL NO ACCESS'
  END as access_status
FROM year_wheels yw
LEFT JOIN team_members tm ON tm.team_id = yw.team_id AND tm.user_id = auth.uid()
WHERE yw.team_id IS NOT NULL
ORDER BY yw.updated_at DESC;

-- All wheels should now show "✅ Owner" or "✅ Team Member"
