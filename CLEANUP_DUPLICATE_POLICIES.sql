-- =============================================
-- CLEANUP DUPLICATE POLICIES
-- =============================================

-- Drop the old/duplicate SELECT policy
DROP POLICY IF EXISTS "Users can view own or public wheels" ON public.year_wheels;

-- Keep only the comprehensive one
-- "Users can view their wheels and team wheels and public wheels" (already exists)

-- Verify only one SELECT policy remains
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'year_wheels'
AND cmd = 'SELECT'
ORDER BY policyname;

-- Test anonymous access to public wheel
SET LOCAL ROLE TO anon;
SELECT 
  id,
  title,
  is_public
FROM public.year_wheels
WHERE id = '436bdd25-0838-44c8-9a79-b707cdc090fe';
RESET ROLE;

-- If the test query returns the wheel, it's working!
