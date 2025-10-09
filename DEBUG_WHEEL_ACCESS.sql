-- =============================================
-- DEBUG WHEEL ACCESS
-- =============================================

-- Step 1: Check if wheel exists (bypassing RLS)
-- Run this in SQL Editor which has service_role access
SELECT 
  id,
  title,
  is_public,
  user_id,
  team_id,
  created_at,
  updated_at
FROM public.year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Step 2: If is_public is FALSE, set it to TRUE
UPDATE public.year_wheels
SET is_public = TRUE,
    updated_at = NOW()
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Step 3: Verify the update
SELECT 
  id,
  title,
  is_public,
  user_id,
  team_id
FROM public.year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';

-- Step 4: Test the SELECT policy manually
-- This simulates what an unauthenticated user would see
SET LOCAL ROLE TO anon;
SELECT 
  id,
  title,
  is_public
FROM public.year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';
RESET ROLE;

-- If the last query returns 0 rows, the policy is wrong
-- If it returns 1 row, the policy works!
