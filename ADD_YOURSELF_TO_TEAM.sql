-- =============================================
-- QUICK FIX: Add yourself to the team
-- =============================================

-- Step 1: Find your user_id from the wheel owner_id
-- (You own the wheel, so the owner_id is your user_id)
SELECT 
  user_id as your_user_id,
  'Copy this UUID and use it in Step 2' as instruction
FROM year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- From the screenshot, your user_id is: 822e88be-ee52-42b5-a72a-c847e80933e6

-- Step 2: Check if you're already in the team
SELECT *
FROM team_members
WHERE team_id = 'ecb866bd-443f-4df7-85f0-1653dc41816b'
AND user_id = '822e88be-ee52-42b5-a72a-c847e80933e6';

-- If above returns NO ROWS, run Step 3

-- Step 3: Add yourself to the team (using your actual user_id)
INSERT INTO team_members (team_id, user_id, role)
VALUES (
  'ecb866bd-443f-4df7-85f0-1653dc41816b',
  '822e88be-ee52-42b5-a72a-c847e80933e6',
  'owner'
)
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Step 4: Verify you're now in the team
SELECT *
FROM team_members
WHERE team_id = 'ecb866bd-443f-4df7-85f0-1653dc41816b'
AND user_id = '822e88be-ee52-42b5-a72a-c847e80933e6';

-- Should now show your user_id and role = 'owner'

-- =============================================
-- AFTER RUNNING THIS:
-- =============================================
-- 1. Refresh your browser (Ctrl+R or Cmd+R)
-- 2. Try importing the file again
-- 3. Should work without 403 errors!
